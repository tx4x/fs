import { validateArgument } from './utils/validate';
import { sync as inspectSync } from './inspect';
import { async as listAsync, sync as listSync } from './list';
import * as pathUtil from 'path';
import { rmdir, unlink, rmdirSync, unlinkSync } from 'fs';
import { ErrNoFileOrDir } from './errors';
import { IDeleteOptions, IProcessingNode, ErrnoException } from './interfaces';
import { create as matcher } from './utils/matcher';
import { IConflictSettings, ENodeOperationStatus, TDeleteResult, INodeReport, EDeleteFlags, EResolve, EResolveMode } from './interfaces';
import { createItem } from './inspect';
import { async as iteratorAsync } from './iterator';
import { ArrayIterator } from '@xblox/core/iterator';
import { ErrCantDelete } from './errors';

// tslint:disable-next-line:no-require-imports
// tslint:disable-next-line:no-var-requires
const trash = require('trash');

export function validateInput(methodName: string, path: string) {
	const methodSignature = methodName + '([path])';
	validateArgument(methodSignature, 'path', path, ['string', 'undefined']);
}

const parseOptions = (options: any | null, path: string): IDeleteOptions => {
	const opts: IDeleteOptions = options || {} as IDeleteOptions;
	const parsedOptions: IDeleteOptions = {};
	parsedOptions.progress = opts.progress;
	parsedOptions.conflictCallback = opts.conflictCallback;
	parsedOptions.conflictSettings = opts.conflictSettings;
	parsedOptions.debug = opts.debug;
	parsedOptions.trash = opts.trash;
	parsedOptions.matching = opts.matching;
	if (!opts.filter) {
		if (opts.matching) {
			parsedOptions.filter = matcher(path, opts.matching);
		} else {
			parsedOptions.filter = () => {
				return true;
			};
		}
	}
	return parsedOptions;
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
export function sync(path: string, options?: IDeleteOptions): void {
	const inspectedFile = inspectSync(path, { symlinks: true });
	if (inspectedFile === undefined) {
		// The path already doesn't exits. Nothing to do here.
	} else if (inspectedFile.type === 'dir') {
		listSync(path).forEach((filename) => {
			sync(pathUtil.join(path, filename));
		});
		rmdirSync(path);
	} else if (inspectedFile.type === 'file' || inspectedFile.type === 'symlink') {
		unlinkSync(path);
	} else {
		throw ErrNoFileOrDir(path);
	}
}
const rmTrash = (path: string) => {
	return trash([path]);
};
// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
const rmASync = (path: string, options: IDeleteOptions): any => {
	return options.trash ? rmTrash(path) : new Promise<void>((resolve, reject) => {
		unlink(path, (err: ErrnoException) => {
			if (!err) {
				resolve();
			} else {
				reject(err);
			}
		});

	});
};
interface IVisitorArgs {
	resolve: Function;
	reject: Function;
	abort: boolean;
	filesInProgress: number;
	resolveSettings: IConflictSettings;
	options: IDeleteOptions;
	result: TDeleteResult;
	nodes: IProcessingNode[];
}
const isDone = (nodes: IProcessingNode[]) => {
	let done = true;
	nodes.forEach((element: IProcessingNode) => {
		if (element.status !== ENodeOperationStatus.DONE) {
			done = false;
		}
	});
	return done;
};
const next = (nodes: IProcessingNode[]): IProcessingNode => {
	for (let i = 0; i < nodes.length; i++) {
		if (nodes[i].status === ENodeOperationStatus.COLLECTED) {
			return nodes[i];
		}
	}
	return null;
};
// handle user side setting "THROW" and non enum values (null)
const onConflict = (from: string, options: IDeleteOptions, settings: IConflictSettings): EResolveMode | undefined => {
	switch (settings.overwrite) {
		case EResolveMode.THROW: {
			throw ErrCantDelete(from);
		}
		case EResolveMode.OVERWRITE:
		case EResolveMode.APPEND:
		case EResolveMode.IF_NEWER:
		case EResolveMode.ABORT:
		case EResolveMode.IF_SIZE_DIFFERS:
		case EResolveMode.SKIP: {
			return settings.overwrite;
		}
		default: {
			return undefined;
		}
	}
};
export function resolveConflict(path: string, resolveMode: EResolveMode): boolean {
	if (resolveMode === undefined) {
		return true;
	}
	if (resolveMode === EResolveMode.SKIP) {
		return false;
	} else if (resolveMode === EResolveMode.ABORT) {
		return false;
	} else if (resolveMode === EResolveMode.RETRY) {
		return true;
	}
	return false;
}
const visitor = (path: string, vars: IVisitorArgs, item: IProcessingNode): Promise<void> => {
	const options = vars.options;

	if (!item) {
		return;
	}
	item.status = ENodeOperationStatus.PROCESSING;
	const done = () => {
		item.status = ENodeOperationStatus.DONE;
		if (isDone(vars.nodes)) {
			return vars.resolve(vars.result);
		} else {
			if (vars.nodes.length) {
				const itemInner = next(vars.nodes);
				if (itemInner) {
					visitor(itemInner.path, vars, itemInner);
				} else {
					vars.resolve(vars.result);
				}
			}

		}
	};
	if (isDone(vars.nodes)) {
		return vars.resolve(vars.result);
	}
	vars.filesInProgress += 1;
	rmASync(path, options)
		.then((res: any) => {
			done();
		})
		.catch((err: ErrnoException) => {
			if (err.code === 'EACCES' || err.code === 'EPERM' || err.code === 'EISDIR' || err.code === 'ENOTEMPTY') {

				const resolved = (settings: IConflictSettings) => {
					settings.error = err.code;
					// feature : report
					if (settings && options && options.flags && options.flags & EDeleteFlags.REPORT) {
						(vars.result as INodeReport[]).push({
							error: settings.error,
							node: item,
							resolved: settings
						} as INodeReport);
					}
					if (settings) {
						// if the first resolve callback returned an individual resolve settings "THIS",
						// ask the user again with the same item
						const always = settings.mode === EResolve.ALWAYS;
						if (always) {
							options.conflictSettings = settings;
						}

						let how = settings.overwrite;
						how = onConflict(item.path, options, settings);
						if (how === EResolveMode.ABORT) {
							vars.abort = true;
						}
						if (vars.abort) {
							done();
							return;
						}
						if (!resolveConflict(item.path, how)) {
							done();
							return;
						}
						item.status = ENodeOperationStatus.PROCESS;
						if (settings.overwrite === EResolveMode.RETRY) {
							item.status = ENodeOperationStatus.COLLECTED;
							visitor(path, vars, item);
						}
					}
				};

				if (!options.conflictSettings) {
					const promise = options.conflictCallback(path, createItem(path), err.code);
					promise.then(resolved);
				} else {
					resolved(options.conflictSettings);
				}
			}
		});
};

async function collect(path: string, options?: IDeleteOptions): Promise<IProcessingNode[]> {
	return new Promise<IProcessingNode[]>((resolve, reject) => {
		const all: IProcessingNode[] = [];
		iteratorAsync(path, {
			filter: options.filter
		}).then((it: ArrayIterator<IProcessingNode>) => {
			let node: IProcessingNode = null;
			while (node = it.next()) {
				all.push({
					path: node.path,
					item: node.item,
					status: ENodeOperationStatus.COLLECTED
				});
			}
			resolve(all);
		}).catch((err: Error) => {
			console.error('read error', err);
		});
	});
}
export async function async(path: string, options?: IDeleteOptions): Promise<TDeleteResult> {
	options = parseOptions(options, path);
	const onError = (err: ErrnoException, resolve: any, reject: any, nodes?: IProcessingNode[]) => {
		if (err.code === 'EPERM' || err.code === 'EISDIR' || err.code === 'ENOTEMPTY') {
			const proceed = () => {
				// It's not a file, it's a directory.
				// Must delete everything inside first.
				listAsync(path).then((filenamesInsideDir: string[]) => {
					const promises = filenamesInsideDir.map((filename: string) => {
						return async(pathUtil.join(path, filename), options);
					});
					return Promise.all(promises);
				}).then(() => {
					// Everything inside directory has been removed,
					// it's safe now to go for the directory itself.
					return rmdir(path, (err2: ErrnoException) => {
						if (err2) {
							reject(err2);
						}
					});
				})
					.then(resolve, reject);
			};
			// we have a user conflict callback,
			// collect nodes and start asking
			if (options.conflictCallback) {
				const result: TDeleteResult = void 0;
				// walker variables
				const visitorArgs: IVisitorArgs = {
					resolve: resolve,
					reject: reject,
					abort: false,
					filesInProgress: 0,
					resolveSettings: null,
					options: options,
					result: result,
					nodes: nodes || []
				};

				const process = () => {
					visitorArgs.nodes = nodes;
					if (isDone(nodes)) {
						return resolve(result);
					}
					if (nodes.length) {
						const item = next(nodes);
						if (item) {
							visitor(item.path, visitorArgs, item);
						}
					}
				};
				if (!nodes) {
					const _nodes = visitorArgs.nodes;
					iteratorAsync(path, {
						filter: options.filter
					}).then((it: ArrayIterator<IProcessingNode>) => {
						let node: IProcessingNode = null;
						while (node = it.next()) {
							_nodes.push({
								path: node.path,
								item: node.item,
								status: ENodeOperationStatus.COLLECTED
							});
						}
						process();
					}).catch((err2: Error) => {
						console.error('read error', err2);
					});
				} else {
					process();
				}
			} else {
				proceed();
			}
		} else if (err.code === 'ENOENT') {
			// File already doesn't exist. We're done.
			resolve();
		} else {
			// Something unexpected happened. Rethrow original error.
			reject(err);
		}
	};

	// if matching is set, its like rm somePath/*.ext
	// in this case, we collect the inner matching nodes and proceed as it
	// would be an error
	if (options.matching) {
		const nodes = await collect(path, options);
		const err = new ErrnoException('dummy');
		err.code = 'ENOTEMPTY';
		return new Promise<TDeleteResult>((resolve, reject) => {
			onError(err, resolve, reject, nodes);
		});
	} else {
		return new Promise<TDeleteResult>((resolve, reject) => {
			// Assume the path is a file or directory and just try to remove it.
			rmASync(path, options)
				.then((res: any) => resolve())
				.catch((err: ErrnoException) => {
					onError(err, resolve, reject);
				});
		});
	}
}

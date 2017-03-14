import * as  pathUtil from "path";
import * as fs from 'fs';
import { symlinkSync, readFileSync, createReadStream, createWriteStream } from 'fs';
import * as mkdirp from 'mkdirp';

import { sync as existsSync, async as existsASync } from './exists';
import { create as matcher } from './utils/matcher';
import { normalizeFileMode as fileMode } from './utils/mode';
import { sync as treeWalkerSync } from './utils/tree_walker';
import { validateArgument, validateOptions } from './utils/validate';
import { sync as writeSync } from './write';
import { ErrDestinationExists, ErrDoesntExists } from './errors';
import { INode, ENodeType, IWriteOptions, ECopyFlags, ENodeOperationStatus, EError, ErrnoException, EInspectFlags, IProcessingNode, ICopyOptions, EResolveMode, IConflictSettings, EResolve, TCopyResult, INodeReport } from './interfaces';
import { createItem } from './inspect';
import { sync as rmSync } from './remove';
import { promisify } from './promisify';
import { async as iteratorAsync } from './iterator';
import { ArrayIterator } from '@xblox/core/iterator';

const promisedSymlink = promisify<string, string | Buffer, string, Function>(fs.symlink);
const promisedReadlink = promisify(fs.readlink);
const promisedUnlink = promisify(fs.unlink);
const promisedMkdirp = promisify<string, any, Function>(mkdirp);

const progress = require('progress-stream');
const throttle = require('throttle');


const CPROGRESS_THRESHOLD = 1048576 * 5; // minimum file size threshold to use write progress = 5MB

export function validateInput(methodName: string, from: string, to: string, options?: ICopyOptions): void {
	const methodSignature = methodName + '(from, to, [options])';
	validateArgument(methodSignature, 'from', from, ['string']);
	validateArgument(methodSignature, 'to', to, ['string']);
	validateOptions(methodSignature, 'options', options, {
		overwrite: ['boolean'],
		matching: ['string', 'array of string'],
		progress: ['function'],
		writeProgress: ['function'],
		conflictCallback: ['function'],
		conflictSettings: ['object'],
		throttel: ['number'],
		debug: ['boolean'],
		flags: ['number']
	});
};
const parseOptions = (options: any | null, from: string): ICopyOptions => {
	const opts: ICopyOptions = options || {} as ICopyOptions;
	const parsedOptions: ICopyOptions = {};
	parsedOptions.overwrite = opts.overwrite;
	parsedOptions.progress = opts.progress;
	parsedOptions.writeProgress = opts.writeProgress;
	parsedOptions.conflictCallback = opts.conflictCallback;
	parsedOptions.conflictSettings = opts.conflictSettings;
	parsedOptions.debug = opts.debug;
	parsedOptions.throttel = opts.throttel;
	parsedOptions.flags = opts.flags || 0;
	if (!opts.filter) {
		if (opts.matching) {
			parsedOptions.filter = matcher(from, opts.matching);
		} else {
			parsedOptions.filter = () => { return true; };
		}
	}
	return parsedOptions;
};
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
const checksBeforeCopyingSync = (from: string, to: string, options?: ICopyOptions) => {
	if (!existsSync(from)) {
		throw ErrDoesntExists(from);
	}

	if (existsSync(to) && !options.overwrite) {
		throw ErrDestinationExists(to);
	}
};

async function copyFileSyncWithProgress(from: string, to: string, options?: ICopyOptions) {
	return new Promise((resolve, reject) => {
		const started = Date.now();
		let cbCalled = false;
		let elapsed = Date.now();
		let speed = 0;
		let done = (err?: any) => {
			if (!cbCalled) {
				cbCalled = true;
				resolve();
			}
		};
		const rd = createReadStream(from).
			on("error", (err: Error) => done(err));

		const str = progress({
			length: fs.statSync(from).size,
			time: 100
		}).on('progress', (e: any) => {
			elapsed = (Date.now() - started) / 1000;
			speed = e.transferred / elapsed;
			options.writeProgress(from, e.transferred, e.length);
		});

		const wr = createWriteStream(to);
		wr.on("error", (err: Error) => done(err));
		wr.on("close", done);

		rd.pipe(str).pipe(wr);
	});
};

async function copyFileSync(from: string, to: string, mode: string, options?: ICopyOptions) {
	const data = readFileSync(from);
	const writeOptions: IWriteOptions = {
		mode: mode
	};
	if (options && options.writeProgress) {
		await copyFileSyncWithProgress(from, to, options);
	} else {
		writeSync(to, data, writeOptions);
	}
};
const copySymlinkSync = (from: string, to: string) => {
	const symlinkPointsAt = fs.readlinkSync(from);
	try {
		symlinkSync(symlinkPointsAt, to);
	} catch (err) {
		// There is already file/symlink with this name on destination location.
		// Must erase it manually, otherwise system won't allow us to place symlink there.
		if (err.code === 'EEXIST') {
			fs.unlinkSync(to);
			// Retry...
			fs.symlinkSync(symlinkPointsAt, to);
		} else {
			throw err;
		}
	}
};

async function copyItemSync(from: string, inspectData: INode, to: string, options: ICopyOptions) {
	const mode: string = fileMode(inspectData.mode);
	if (inspectData.type === ENodeType.DIR) {
		mkdirp.sync(to, { mode: parseInt(mode, 8), fs: null });
	} else if (inspectData.type === ENodeType.FILE) {
		await copyFileSync(from, to, mode, options);
	} else if (inspectData.type === ENodeType.SYMLINK) {
		copySymlinkSync(from, to);
	}
};
export function sync(from: string, to: string, options?: ICopyOptions): void {
	const opts = parseOptions(options, from);
	checksBeforeCopyingSync(from, to, opts);
	let nodes: IProcessingNode[] = [];
	let sizeTotal = 0;
	if (options && options.flags & ECopyFlags.EMPTY) {
		const dstStat = fs.statSync(to);
		if (dstStat.isDirectory()) {
			rmSync(to);
		}
	}

	const visitor = (path: string, inspectData: INode) => {
		if (opts.filter(path)) {
			nodes.push({
				path: path,
				item: inspectData,
				dst: pathUtil.resolve(to, pathUtil.relative(from, path))
			});
			sizeTotal += inspectData.size;
		}
	};

	treeWalkerSync(from, {
		inspectOptions: {
			mode: true,
			symlinks: true
		}
	}, visitor);

	Promise.all(nodes.map(async (item, current) => {
		await copyItemSync(item.path, item.item, item.dst, options);
		if (opts.progress) {
			opts.progress(item.path, current, nodes.length, item.item);
		}
	}));
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

/**
 *
 *
 * @param {string} from
 * @param {string} to
 * @param {ICopyOptions} opts
 * @returns {(Promise<IConflictSettings | any>)}
 */
const checkAsync = (from: string, to: string, opts: ICopyOptions): Promise<IConflictSettings | any> => {
	return existsASync(from)
		.then(srcPathExists => {
			if (!srcPathExists) {
				throw ErrDoesntExists(from);
			} else {
				return existsASync(to);
			}
		})
		.then(destPathExists => {
			if (destPathExists) {
				if (opts.conflictSettings) {
					return Promise.resolve(opts.conflictSettings);
				}
				if (opts.conflictCallback) {
					const promise = opts.conflictCallback(to, createItem(to), EError.EXISTS);
					promise.then((settings: IConflictSettings) => {
						settings.error = EError.EXISTS;
					});
					return promise;
				}
				if (!opts.overwrite) {
					throw ErrDestinationExists(to);
				}
			}
		});
};

const copyFileAsync = (from: string, to: string, mode: any, options?: ICopyOptions, retriedAttempt?: boolean) => {
	return new Promise((resolve, reject) => {
		const readStream = fs.createReadStream(from);
		const writeStream = fs.createWriteStream(to, { mode: mode });
		readStream.on('error', reject);
		writeStream.on('error', (err: ErrnoException) => {
			const toDirPath = pathUtil.dirname(to);
			// Force read stream to close, since write stream errored
			// read stream serves us no purpose.
			readStream.resume();
			if (err.code === EError.NOEXISTS && retriedAttempt === undefined) {
				// Some parent directory doesn't exits. Create it and retry.
				promisedMkdirp(toDirPath, null).then(() => {
					// Make retry attempt only once to prevent vicious infinite loop
					// (when for some obscure reason I/O will keep returning ENOENT error).
					// Passing retriedAttempt = true.
					copyFileAsync(from, to, mode, true)
						.then(resolve)
						.catch(reject);
				});
			} else {
				reject(err);
			}
		});

		writeStream.on('finish', () => {
			// feature: preserve times
			if (options && options.flags & ECopyFlags.PRESERVE_TIMES) {
				const sourceStat = fs.statSync(from);
				fs.open(to, 'w', (err: ErrnoException, fd: number) => {
					if (err) { throw err; };
					fs.futimes(fd, sourceStat.atime, sourceStat.mtime, (err) => {
						if (err) {
							throw err;
						};
						fs.close(fd);
						resolve();
					});
				});
			} else {
				resolve();
			}
		});

		const size = fs.statSync(from).size;
		let progressStream = null;
		if (options && options.writeProgress && size > CPROGRESS_THRESHOLD) {
			progressStream = progress({
				length: fs.statSync(from).size,
				time: 100 // call progress each 100 ms
			});
			let elapsed = Date.now();
			let speed = 0;
			const started = Date.now();
			progressStream.on('progress', (e: any) => {
				elapsed = (Date.now() - started) / 1000;
				speed = e.transferred / elapsed;
				options.writeProgress(from, e.transferred, e.length);
				if (options.debug) {
					console.log('write ' + from + ' (' + e.transferred + ' of ' + e.length);
				}
			});
			if (options.throttel) {
				readStream.pipe(progressStream).pipe(new throttle(options.throttel)).pipe(writeStream);
			} else {
				readStream.pipe(progressStream).pipe(writeStream);
			}
		} else {
			if (options && options.debug) {
				console.log('write ' + from + ' to ' + to);
			}
			readStream.pipe(writeStream);
		}
	});
};
export function copySymlinkAsync(from: string, to: string) {
	return promisedReadlink(from)
		.then((symlinkPointsAt: string) => {
			return new Promise((resolve, reject) => {
				promisedSymlink(symlinkPointsAt, to, null)
					.then(resolve)
					.catch((err: ErrnoException) => {
						if (err.code === EError.EXISTS) {
							// There is already file/symlink with this name on destination location.
							// Must erase it manually, otherwise system won't allow us to place symlink there.
							promisedUnlink(to)
								// Retry...
								.then(() => { return promisedSymlink(symlinkPointsAt, to, null); })
								.then(resolve, reject);
						} else {
							reject(err);
						}
					});
			});
		});
};

const copyItemAsync = (from: string, inspectData: INode, to: string, options: ICopyOptions): Promise<any> => {
	const mode = fileMode(inspectData.mode);
	if (inspectData.type === ENodeType.DIR) {
		return promisedMkdirp(to, { mode: mode });
	} else if (inspectData.type === ENodeType.FILE) {
		return copyFileAsync(from, to, mode, options);
	} else if (inspectData.type === ENodeType.SYMLINK) {
		return copySymlinkAsync(from, to);
	}
	// EInspectItemType.OTHER
	return Promise.resolve();
};
// handle user side setting "THROW" and non enum values (null)
const onConflict = (from: string, to: string, options: ICopyOptions, settings: IConflictSettings): EResolveMode | undefined => {
	switch (settings.overwrite) {
		case EResolveMode.THROW: {
			throw ErrDestinationExists(to);
		}
		case EResolveMode.OVERWRITE:
		case EResolveMode.APPEND:
		case EResolveMode.IF_NEWER:
		case EResolveMode.ABORT:
		case EResolveMode.IF_SIZE_DIFFERS:
		case EResolveMode.SKIP: {
			return settings.overwrite;
		}
	}
	return undefined;
};

export function resolveConflict(from: string, to: string, options: ICopyOptions, resolveMode: EResolveMode): boolean {
	if (resolveMode === undefined) {
		return true;
	}
	const src = createItem(from);
	const dst = createItem(to);
	if (resolveMode === EResolveMode.SKIP) {
		return false;
	} else if (resolveMode === EResolveMode.IF_NEWER) {
		if (src.type === ENodeType.DIR && dst.type === ENodeType.DIR) {
			return true;
		}
		if (dst.modifyTime.getTime() > src.modifyTime.getTime()) {
			return false;
		}
	} else if (resolveMode === EResolveMode.IF_SIZE_DIFFERS) {
		// @TODO : not implemented: copy EInspectItemType.DIR with ECopyResolveMode.IF_SIZE_DIFFERS
		if (src.type === ENodeType.DIR && dst.type === ENodeType.DIR) {
			return true;
		} else if (src.type === ENodeType.FILE && dst.type === ENodeType.FILE) {
			if (src.size === dst.size) {
				return false;
			}
		}
	} else if (resolveMode === EResolveMode.OVERWRITE) {
		return true;
	} else if (resolveMode === EResolveMode.ABORT) {
		return false;
	}
};

function isDone(nodes: IProcessingNode[]) {
	let done = true;
	nodes.forEach((element: IProcessingNode) => {
		if (element.status !== ENodeOperationStatus.DONE) {
			done = false;
		}
	});
	return done;
}
process.on('unhandledRejection', (reason: string) => {
	console.error('Unhandled rejection, reason: ', reason);
});
/**
 * A callback for treeWalkerStream. This is called when a node has been found.
 *
 * @param {string} from
 * @param {string} to
 * @param {*} vars
 * @param {{ path: string, item: INode }} item
 * @returns {Promise<void>}
 */
async function visitor(from: string, to: string, vars: IVisitorArgs, item: IProcessingNode): Promise<void> {
	const options = vars.options;
	let rel: string;
	let destPath: string;
	if (!item) {
		return;
	}
	rel = pathUtil.relative(from, item.path);
	destPath = pathUtil.resolve(to, rel);

	item.status = ENodeOperationStatus.PROCESSING;
	const done = () => {
		item.status = ENodeOperationStatus.DONE;
		if (isDone(vars.nodes)) {
			return vars.resolve(vars.result);
		}
	};
	if (isDone(vars.nodes)) {
		return vars.resolve(vars.result);
	}
	vars.filesInProgress += 1;
	// our main function after sanity checks
	const checked = (subResolveSettings: IConflictSettings) => {
		item.status = ENodeOperationStatus.CHECKED;
		// feature : report
		if (options && options.flags && options.flags & ECopyFlags.REPORT) {
			(vars.result as INodeReport[]).push({
				error: subResolveSettings.error,
				node: item,
				resolved: subResolveSettings
			} as INodeReport);
		}
		if (subResolveSettings) {
			// if the first resolve callback returned an individual resolve settings "THIS",
			// ask the user again with the same item
			let always = subResolveSettings.mode === EResolve.ALWAYS;
			if (always) {
				options.conflictSettings = subResolveSettings;
			}
			let overwriteMode = subResolveSettings.overwrite;
			overwriteMode = onConflict(item.path, destPath, options, subResolveSettings);

			if (overwriteMode === EResolveMode.ABORT) {
				vars.abort = true;
			}
			if (vars.abort) {
				return;
			}

			if (!resolveConflict(item.path, destPath, options, overwriteMode)) {
				done();
				return;
			}

		}
		item.status = ENodeOperationStatus.COPYING;
		copyItemAsync(item.path, item.item, destPath, options).then(() => {
			vars.filesInProgress -= 1;
			if (options.progress) {
				if (options.progress(item.path, vars.filesInProgress, vars.filesInProgress, item.item) === false) {
					vars.abort = true;
					return vars.resolve();
				}
			}
			done();
		}).catch((err: ErrnoException) => {
			if (options && options.conflictCallback) {
				if (err.code === EError.PERMISSION || err.code === EError.NOEXISTS) {
					options.conflictCallback(item.path, createItem(destPath), err.code).then((errorResolveSettings: IConflictSettings) => {
						// the user has set the conflict resolver to always, so we use the last one
						if (vars.onCopyErrorResolveSettings) {
							errorResolveSettings = vars.onCopyErrorResolveSettings;
						}
						// user said use this settings always, we track and use this last setting from now on
						if (errorResolveSettings.mode === EResolve.ALWAYS && !vars.onCopyErrorResolveSettings) {
							vars.onCopyErrorResolveSettings = errorResolveSettings;
						}

						if (errorResolveSettings.overwrite === EResolveMode.ABORT) {
							vars.abort = true;
							return vars.resolve();
						}
						if (errorResolveSettings.overwrite === EResolveMode.THROW) {
							vars.abort = true;
							return vars.reject(err);
						}
						if (errorResolveSettings.overwrite === EResolveMode.SKIP) {
							vars.filesInProgress -= 1;
						}

						// user error, should never happen, unintended
						if (errorResolveSettings.overwrite === EResolveMode.IF_NEWER ||
							errorResolveSettings.overwrite === EResolveMode.IF_SIZE_DIFFERS ||
							errorResolveSettings.overwrite === EResolveMode.OVERWRITE) {
							vars.reject(new ErrnoException('settings make no sense : errorResolveSettings.overwrite = ' + errorResolveSettings.overwrite));
						}
					});
				}
			}
			vars.reject(err);
		});
	};
	return checkAsync(item.path, destPath, options).then(checked);
}
function next(nodes: IProcessingNode[]): IProcessingNode {
	for (let i = 0; i < nodes.length; i++) {
		if (nodes[i].status === ENodeOperationStatus.COLLECTED) {
			return nodes[i];
		}
	}
	return null;
}

interface IVisitorArgs {
	resolve: Function;
	reject: Function;
	abort: boolean;
	filesInProgress: number;
	resolveSettings: IConflictSettings;
	options: ICopyOptions;
	result: TCopyResult;
	nodes: IProcessingNode[];
	onCopyErrorResolveSettings: IConflictSettings;
}

/**
 * Final async copy function.
 * @export
 * @param {string} from
 * @param {string} to
 * @param {ICopyOptions} [options]
 * @returns
 */
export function async(from: string, to: string, options?: ICopyOptions): Promise<TCopyResult> {
	options = parseOptions(options, from);
	return new Promise<TCopyResult>((resolve, reject) => {
		checkAsync(from, to, options).then((resolver: IConflictSettings) => {
			if (!resolver) {
				resolver = options.conflictSettings || {
					mode: EResolve.THIS,
					overwrite: EResolveMode.OVERWRITE
				};
			} else {
				if (resolver.mode === EResolve.ALWAYS) {
					options.conflictSettings = resolver;
				}
			}
			let overwriteMode = resolver.overwrite;
			let result: TCopyResult = void 0;

			if (options && options.flags && options.flags & ECopyFlags.REPORT) {
				result = [];
			}

			// call onConflict to eventually throw an error
			overwriteMode = onConflict(from, to, options, resolver);

			// now evaluate the copy conflict settings and eventually abort
			if (options && options.conflictSettings && !resolveConflict(from, to, options, overwriteMode)) {
				return resolve();
			}
			// feature: clean before
			if (options && options.flags & ECopyFlags.EMPTY) {
				const dstStat = fs.statSync(to);
				if (dstStat.isDirectory()) {
					rmSync(to);
				}
			}
			// walker variables
			const visitorArgs: IVisitorArgs = {
				resolve: resolve,
				reject: reject,
				abort: false,
				filesInProgress: 0,
				resolveSettings: resolver,
				options: options,
				result: result,
				nodes: [],
				onCopyErrorResolveSettings: null
			};
			const nodes = visitorArgs.nodes;
			// a function called when the treeWalkerStream or visitor has been finished
			const process = function () {
				visitorArgs.nodes = nodes;
				if (isDone(nodes)) {
					return resolve(result);
				}
				if (nodes.length) {
					const item = next(nodes);
					if (item) {
						visitor(item.path, item.dst, visitorArgs, item).then(process);
					}
				}
			};

			let flags: EInspectFlags = EInspectFlags.MODE;
			if (options && options.flags && options.flags & ECopyFlags.FOLLOW_SYMLINKS) {
				flags |= EInspectFlags.SYMLINKS;
			}
			iteratorAsync(from, {
				filter: options.filter,
				flags: flags
			}).then((it: ArrayIterator<IProcessingNode>) => {
				let node: IProcessingNode = null;
				while (node = it.next()) {
					nodes.push({
						path: node.path,
						item: node.item,
						dst: pathUtil.resolve(to, pathUtil.relative(from, node.path)),
						status: ENodeOperationStatus.COLLECTED
					});
				}
				process();
			});
		}).catch(reject);
	});
};

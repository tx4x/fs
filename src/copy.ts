import * as  pathUtil from "path";
import * as fs from 'fs';
import { symlinkSync, readFileSync, createReadStream, createWriteStream } from 'fs';

import * as mkdirp from 'mkdirp';
import { sync as existsSync, async as existsASync } from './exists';
import { create as matcher } from './utils/matcher';
import { normalizeFileMode as fileMode } from './utils/mode';
import { sync as treeWalkerSync, stream as treeWalkerStream } from './utils/tree_walker';
import { validateArgument, validateOptions } from './utils/validate';
import { sync as writeSync } from './write';
import { ErrDestinationExists, ErrDoesntExists } from './errors';
import { INode, ENodeType, IWriteOptions } from './interfaces';
import { EError, ErrnoException } from './interfaces';
import { createItem } from './inspect';
import { ICopyOptions, EResolveMode, IConflictSettings, EResolve } from './interfaces';
const Q = require('q');
const promisedSymlink = Q.denodeify(fs.symlink);
const promisedReadlink = Q.denodeify(fs.readlink);
const promisedUnlink = Q.denodeify(fs.unlink);
const promisedMkdirp = Q.denodeify(mkdirp);
const progress = require('progress-stream');

interface ICopyTask {
	path: string;
	item: INode;
	dst: string;
	done: boolean;
}

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
		conflictSettings: ['object']
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
	if (opts.matching) {
		parsedOptions.allowedToCopy = matcher(from, opts.matching);
	} else {
		parsedOptions.allowedToCopy = () => { return true; };
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
		const rd = createReadStream(from);
		const str = progress({
			length: fs.statSync(from).size,
			time: 100
		});
		str.on('progress', (e: any) => {
			elapsed = (Date.now() - started) / 1000;
			speed = e.transferred / elapsed;
			options.writeProgress(from, e.transferred, e.length);
		});
		rd.on("error", (err: Error) => done(err));
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
	let nodes: ICopyTask[] = [];
	let current: number = 0;
	let sizeTotal: number = 0;

	const visitor = (path: string, inspectData: INode) => {
		const rel = pathUtil.relative(from, path);
		const destPath = pathUtil.resolve(to, rel);
		if (opts.allowedToCopy(path)) {
			nodes.push({
				path: path,
				item: inspectData,
				dst: destPath,
				done: false
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
				console.error('doesn ', new Error().stack);
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
					return opts.conflictCallback(to, createItem(to), EError.EXISTS);
				} else {
					console.error('-------no ccb');
				}
				if (!opts.overwrite) {
					console.error('------------------');
					throw ErrDestinationExists(to);
				}
			}
		});
};


const copyFileAsync = (from: string, to: string, mode: any, retriedAttempt?: boolean) => {
	return new Promise((resolve, reject) => {
		const readStream = fs.createReadStream(from);
		const writeStream = fs.createWriteStream(to, { mode: mode });
		readStream.on('error', reject);
		writeStream.on('error', (err: ErrnoException) => {
			const toDirPath = pathUtil.dirname(to);
			// Force read stream to close, since write stream errored
			// read stream serves us no purpose.
			readStream.resume();
			if (err.code === 'ENOENT' && retriedAttempt === undefined) {
				// Some parent directory doesn't exits. Create it and retry.
				promisedMkdirp(toDirPath).then(() => {
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
		writeStream.on('finish', resolve);
		readStream.pipe(writeStream);
	});
};

const copySymlinkAsync = (from: string, to: string) => {
	return promisedReadlink(from)
		.then((symlinkPointsAt: string) => {
			return new Promise((resolve, reject) => {
				promisedSymlink(symlinkPointsAt, to)
					.then(resolve)
					.catch((err: ErrnoException) => {

						if (err.code === EError.EXISTS) {
							// There is already file/symlink with this name on destination location.
							// Must erase it manually, otherwise system won't allow us to place symlink there.
							promisedUnlink(to)
								// Retry...
								.then(() => { return promisedSymlink(symlinkPointsAt, to); })
								.then(resolve, reject);
						} else {
							reject(err);
						}
					});
			});
		});
};

const copyItemAsync = (from: string, inspectData: INode, to: string) => {
	const mode = fileMode(inspectData.mode);
	if (inspectData.type === ENodeType.DIR) {
		return promisedMkdirp(to, { mode: mode });
	} else if (inspectData.type === ENodeType.FILE) {
		return copyFileAsync(from, to, mode);
	} else if (inspectData.type === ENodeType.SYMLINK) {
		return copySymlinkAsync(from, to);
	}
	// EInspectItemType.OTHER
	return new Q();
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
function onError(from: string, to: string, options: ICopyOptions, settings: IConflictSettings) {
	/*
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
	*/
	// return new Promise<void>;
};
const resolveConflict = (from: string, to: string, options: ICopyOptions, resolveMode: EResolveMode): boolean => {
	// New logic for overwriting
	if (resolveMode !== undefined) {
		const src = createItem(from);
		const dst = createItem(to);
		if (resolveMode === EResolveMode.SKIP) {
			return false;
		} else if (resolveMode === EResolveMode.IF_NEWER) {
			if (dst.modifyTime.getTime() > src.modifyTime.getTime()) {
				return false;
			}
		} else if (resolveMode === EResolveMode.IF_SIZE_DIFFERS) {
			// @TODO : not implemented: copy EInspectItemType.DIR with ECopyResolveMode.IF_SIZE_DIFFERS
			if (src.type === ENodeType.DIR && dst.type === ENodeType.DIR) {
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
	}
	return true;
};

/*
process.on('unhandledRejection', (reason: string, pomise) => {
	console.error('Unhandled rejection, reason: ', reason, pomise);
});
*/

/**
 * Copy
 *
 *
 * @export
 * @param {string} from
 * @param {string} to
 * @param {ICopyOptions} [options]
 * @returns
 */
export function async(from: string, to: string, options?: ICopyOptions): Promise<void> {
	const opts = parseOptions(options, from);
	return new Promise<void>((resolve, reject) => {
		checkAsync(from, to, opts).then((resolveSettings: IConflictSettings) => {
			if (!resolveSettings) {
				resolveSettings = opts.conflictSettings || {
					mode: EResolve.THIS,
					overwrite: EResolveMode.OVERWRITE
				};
			}
			let overwriteMode = resolveSettings.overwrite;
			overwriteMode = onConflict(from, to, options, resolveSettings);

			if (opts.conflictSettings || opts.conflictCallback && !resolveConflict(from, to, options, overwriteMode)) {
				return resolve();
			}
			let allFilesDelivered = false;
			let filesInProgress = 0;
			let abort = false;
			let onCopyErrorResolveSettings: IConflictSettings = null;

			function visitor() {
				if (abort) {
					return resolve();
				}
				let stream: any = this;
				const item: { path: string, name: string, item: INode } = stream.read();
				let rel: string;
				let destPath: string;
				if (!item) {
					return;
				}
				rel = pathUtil.relative(from, item.path);
				destPath = pathUtil.resolve(to, rel);
				if (!opts.allowedToCopy(item.path)) {
					return;
				}
				filesInProgress += 1;

				checkAsync(item.path, destPath, opts).then((subResolveSettings: IConflictSettings) => {
					// if the first resolve callback returned an individual resolve settings "THIS",
					// ask the user again with the particular item
					let proceed = resolveSettings.mode === EResolve.ALWAYS;
					if (subResolveSettings) {
						if (!proceed) {
							let overwriteMode = subResolveSettings.overwrite;
							overwriteMode = onConflict(item.path, destPath, options, subResolveSettings);
							if (overwriteMode === EResolveMode.ABORT) {
								abort = true;
							}
							if (abort) {
								return;
							}
							if (!resolveConflict(item.path, destPath, options, overwriteMode)) {
								filesInProgress -= 1;
								return;
							}
						}
					}
					copyItemAsync(item.path, item.item, destPath).then(() => {
						filesInProgress -= 1;
						if (opts.progress) {
							if (opts.progress(item.path, filesInProgress, -1, item.item) === false) {
								abort = true;
								return resolve();
							}
						}
						if (allFilesDelivered && filesInProgress === 0) {
							resolve();
						}
					}).catch((err: ErrnoException) => {
						if (options.conflictCallback) {
							if (err.code === EError.PERMISSION || err.code === EError.NOEXISTS) {
								options.conflictCallback(item.path, createItem(destPath), err.code).then((errorResolveSettings: IConflictSettings) => {
									// the user has set the error resolver to always, so we use the last one
									if (onCopyErrorResolveSettings) {
										errorResolveSettings = onCopyErrorResolveSettings;
									}
									// user said use this settings always, we track and use this last setting from now on
									if (errorResolveSettings.mode === EResolve.ALWAYS && !onCopyErrorResolveSettings) {
										onCopyErrorResolveSettings = errorResolveSettings;
									}

									if (errorResolveSettings.overwrite === EResolveMode.ABORT) {
										abort = true;
										return resolve();
									}
									if (errorResolveSettings.overwrite === EResolveMode.THROW) {
										abort = true;
										return reject(err);
									}
									if (errorResolveSettings.overwrite === EResolveMode.SKIP) {
										filesInProgress -= 1;
									}
									// catch modes which make no sense:
									if (errorResolveSettings.overwrite === EResolveMode.IF_NEWER ||
										errorResolveSettings.overwrite === EResolveMode.IF_SIZE_DIFFERS ||
										errorResolveSettings.overwrite === EResolveMode.OVERWRITE) {
										reject(new ErrnoException('settings make no sense'));
									}
								});
							}
						}
						reject(err);
					});
				});
			}

			const stream = treeWalkerStream(from, {
				inspectOptions: {
					mode: true,
					symlinks: true
				}
			}).on('readable', visitor)
				.on('error', reject)
				.on('end', () => {
					allFilesDelivered = true;
					if (allFilesDelivered && filesInProgress === 0) {
						resolve();
					}
				});
		}).catch(reject);
	});
};

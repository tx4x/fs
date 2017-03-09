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
import { INode, ENodeType, IWriteOptions, ECopyFlags } from './interfaces';
import { EError, ErrnoException } from './interfaces';
import { createItem } from './inspect';
import { sync as rmSync } from './remove';
import { ICopyOptions, EResolveMode, IConflictSettings, EResolve } from './interfaces';
import { promisify } from './promisify';

const promisedSymlink = promisify<string, string | Buffer, string, Function>(fs.symlink);
const promisedReadlink = promisify(fs.readlink);
const promisedUnlink = promisify(fs.unlink);
const promisedMkdirp = promisify<string, any, Function>(mkdirp);
const progress = require('progress-stream');
const throttle = require('throttle');

const CPROGRESS_THRESHOLD = 1048576 * 5; // minimum file size threshold to use write progress = 5MB

interface ICopyTask {
	path: string;
	item: INode;
	dst: string;
	done: boolean;
	name?: string;
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
	let nodes: ICopyTask[] = [];
	let sizeTotal = 0;
	if (options && options.flags & ECopyFlags.EMPTY) {
		const dstStat = fs.statSync(to);
		if (dstStat.isDirectory()) {
			rmSync(to);
		}
	}

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
				time: 100
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

/**
 * A callback for treeWalkerStream. This is called when a node has been found.
 *
 * @param {string} from
 * @param {string} to
 * @param {*} vars
 * @param {{ path: string, item: INode }} item
 * @returns {Promise<void>}
 */
async function visitor(from: string, to: string, vars: any, item: { path: string, item: INode }): Promise<void> {
	const options = vars.options;
	let rel: string;
	let destPath: string;
	if (!item) {
		return;
	}
	rel = pathUtil.relative(from, item.path);
	destPath = pathUtil.resolve(to, rel);
	if (!options.allowedToCopy(item.path)) {
		return;
	}
	vars.filesInProgress += 1;

	// our main function after sanity checks
	const checked = (subResolveSettings: IConflictSettings) => {
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
				vars.filesInProgress -= 1;
				if (vars.filesInProgress === 0) {
					vars.resolve();
				}
				return;
			}
		}
		copyItemAsync(item.path, item.item, destPath, options).then(() => {
			vars.filesInProgress -= 1;
			if (options.progress) {
				if (options.progress(item.path, vars.filesInProgress, -1, item.item) === false) {
					vars.abort = true;
					return vars.resolve();
				}
			}
			if (vars.filesInProgress === 0) {
				vars.resolve();
			}
		}).catch((err: ErrnoException) => {
			if (options && options.conflictCallback) {
				if (err.code === EError.PERMISSION || err.code === EError.NOEXISTS) {
					options.conflictCallback(item.path, createItem(destPath), err.code).then((errorResolveSettings: IConflictSettings) => {
						// the user has set the error resolver to always, so we use the last one
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
/**
 * Final async copy function
 * @export
 * @param {string} from
 * @param {string} to
 * @param {ICopyOptions} [options]
 * @returns
 */
export function async(from: string, to: string, options?: ICopyOptions): Promise<void> {
	options = parseOptions(options, from);
	return new Promise<void>((resolve, reject) => {
		checkAsync(from, to, options).then((resolver: IConflictSettings) => {
			if (!resolver) {
				resolver = options.conflictSettings || {
					mode: EResolve.THIS,
					overwrite: EResolveMode.OVERWRITE
				};
			} else {
				options.conflictSettings = resolver;
			}
			let overwriteMode = resolver.overwrite;

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
			const visitorArgs: any = {
				resolve: resolve,
				reject: reject,
				abort: false,
				filesInProgress: 0,
				allFilesDelivered: false,
				resolveSettings: resolver,
				options: options
			};
			let nodes: ICopyTask[] = [];

			// This function is being called each time when the treeWalkerStream got an item!
			// Now instead of calling the 'vistitor', we only collect the item.
			// The reason why we collect and then process each serial is because the
			// conflictCallback needs to be excecuted one by one
			const collector = function () {
				const stream: any = this;
				const item: { path: string, name: string, item: INode } = stream.read();
				if (!item) {
					return;
				}
				nodes.push({
					path: item.path,
					item: item.item,
					dst: pathUtil.resolve(to, pathUtil.relative(from, item.path)),
					name: item.name,
					done: false
				});

			};

			// a function called when the treeWalkerStream or visitor has been finished
			const process = function () {
				if (nodes.length) {
					const item = nodes.shift();
					visitor(item.path, item.dst, visitorArgs, item).then(process);
				}
			};

			// start digging
			treeWalkerStream(from, {
				inspectOptions: {
					mode: true,
					symlinks: options ? options.flags & ECopyFlags.FOLLOW_SYMLINKS ? false : true : true
				}
			}).on('readable', function () { return collector.apply(this, arguments); })
				.on('error', reject)
				.on('end', () => {
					process();
					// a case when nothing matched (single file copy)
					if (nodes.length === 0 && visitorArgs.filesInProgress === 0) {
						resolve();
					}
				});
		}).catch(reject);
	});
};

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const pathUtil = require("path");
const fs = require("fs");
const fs_1 = require("fs");
const mkdirp = require("mkdirp");
const exists_1 = require("./exists");
const matcher_1 = require("./utils/matcher");
const mode_1 = require("./utils/mode");
const tree_walker_1 = require("./utils/tree_walker");
const validate_1 = require("./utils/validate");
const write_1 = require("./write");
const dir_1 = require("./dir");
const errors_1 = require("./errors");
const interfaces_1 = require("./interfaces");
const interfaces_2 = require("./interfaces");
const inspect_1 = require("./inspect");
const interfaces_3 = require("./interfaces");
const Q = require('q');
const promisedSymlink = Q.denodeify(fs.symlink);
const promisedReadlink = Q.denodeify(fs.readlink);
const promisedUnlink = Q.denodeify(fs.unlink);
const promisedMkdirp = Q.denodeify(mkdirp);
const progress = require('progress-stream');
const throttle = require('throttle');
const USE_PROGRESS_THRESHOLD = 1048576 * 5; // minimum file size threshold to use write progress = 5MB
function validateInput(methodName, from, to, options) {
    const methodSignature = methodName + '(from, to, [options])';
    validate_1.validateArgument(methodSignature, 'from', from, ['string']);
    validate_1.validateArgument(methodSignature, 'to', to, ['string']);
    validate_1.validateOptions(methodSignature, 'options', options, {
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
}
exports.validateInput = validateInput;
;
const parseOptions = (options, from) => {
    const opts = options || {};
    const parsedOptions = {};
    parsedOptions.overwrite = opts.overwrite;
    parsedOptions.progress = opts.progress;
    parsedOptions.writeProgress = opts.writeProgress;
    parsedOptions.conflictCallback = opts.conflictCallback;
    parsedOptions.conflictSettings = opts.conflictSettings;
    parsedOptions.debug = opts.debug;
    parsedOptions.throttel = opts.throttel;
    parsedOptions.flags = opts.flags || 0;
    if (opts.matching) {
        parsedOptions.allowedToCopy = matcher_1.create(from, opts.matching);
    }
    else {
        parsedOptions.allowedToCopy = () => { return true; };
    }
    return parsedOptions;
};
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
const checksBeforeCopyingSync = (from, to, options) => {
    if (!exists_1.sync(from)) {
        throw errors_1.ErrDoesntExists(from);
    }
    if (exists_1.sync(to) && !options.overwrite) {
        throw errors_1.ErrDestinationExists(to);
    }
};
function copyFileSyncWithProgress(from, to, options) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const started = Date.now();
            let cbCalled = false;
            let elapsed = Date.now();
            let speed = 0;
            let done = (err) => {
                if (!cbCalled) {
                    cbCalled = true;
                    resolve();
                }
            };
            const rd = fs_1.createReadStream(from);
            const str = progress({
                length: fs.statSync(from).size,
                time: 100
            });
            str.on('progress', (e) => {
                elapsed = (Date.now() - started) / 1000;
                speed = e.transferred / elapsed;
                options.writeProgress(from, e.transferred, e.length);
            });
            rd.on("error", (err) => done(err));
            const wr = fs_1.createWriteStream(to);
            wr.on("error", (err) => done(err));
            wr.on("close", done);
            rd.pipe(str).pipe(wr);
        });
    });
}
;
function copyFileSync(from, to, mode, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const data = fs_1.readFileSync(from);
        const writeOptions = {
            mode: mode
        };
        if (options && options.writeProgress) {
            yield copyFileSyncWithProgress(from, to, options);
        }
        else {
            write_1.sync(to, data, writeOptions);
        }
    });
}
;
const copySymlinkSync = (from, to) => {
    const symlinkPointsAt = fs.readlinkSync(from);
    try {
        fs_1.symlinkSync(symlinkPointsAt, to);
    }
    catch (err) {
        // There is already file/symlink with this name on destination location.
        // Must erase it manually, otherwise system won't allow us to place symlink there.
        if (err.code === 'EEXIST') {
            fs.unlinkSync(to);
            // Retry...
            fs.symlinkSync(symlinkPointsAt, to);
        }
        else {
            throw err;
        }
    }
};
function copyItemSync(from, inspectData, to, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const mode = mode_1.normalizeFileMode(inspectData.mode);
        if (inspectData.type === interfaces_1.ENodeType.DIR) {
            mkdirp.sync(to, { mode: parseInt(mode, 8), fs: null });
        }
        else if (inspectData.type === interfaces_1.ENodeType.FILE) {
            yield copyFileSync(from, to, mode, options);
        }
        else if (inspectData.type === interfaces_1.ENodeType.SYMLINK) {
            copySymlinkSync(from, to);
        }
    });
}
;
function sync(from, to, options) {
    const opts = parseOptions(options, from);
    checksBeforeCopyingSync(from, to, opts);
    let nodes = [];
    let current = 0;
    let sizeTotal = 0;
    if (options && options.flags && interfaces_1.ECopyFlags.EMPTY) {
        const dstStat = fs.statSync(to);
        if (dstStat.isDirectory()) {
            dir_1.sync(to, {
                empty: true
            });
        }
    }
    const visitor = (path, inspectData) => {
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
    tree_walker_1.sync(from, {
        inspectOptions: {
            mode: true,
            symlinks: true
        }
    }, visitor);
    Promise.all(nodes.map((item, current) => __awaiter(this, void 0, void 0, function* () {
        yield copyItemSync(item.path, item.item, item.dst, options);
        if (opts.progress) {
            opts.progress(item.path, current, nodes.length, item.item);
        }
    })));
}
exports.sync = sync;
;
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
const checkAsync = (from, to, opts) => {
    return exists_1.async(from)
        .then(srcPathExists => {
        if (!srcPathExists) {
            console.error('doesn ', new Error().stack);
            throw errors_1.ErrDoesntExists(from);
        }
        else {
            return exists_1.async(to);
        }
    })
        .then(destPathExists => {
        if (destPathExists) {
            if (opts.conflictSettings) {
                return Promise.resolve(opts.conflictSettings);
            }
            if (opts.conflictCallback) {
                return opts.conflictCallback(to, inspect_1.createItem(to), interfaces_2.EError.EXISTS);
            }
            if (!opts.overwrite) {
                throw errors_1.ErrDestinationExists(to);
            }
        }
    });
};
const copyFileAsync = (from, to, mode, options, retriedAttempt) => {
    return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(from);
        const writeStream = fs.createWriteStream(to, { mode: mode });
        readStream.on('error', reject);
        writeStream.on('error', (err) => {
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
            }
            else {
                reject(err);
            }
        });
        writeStream.on('finish', () => {
            if (options && options.flags & interfaces_1.ECopyFlags.PRESERVE_TIMES) {
                const sourceStat = fs.statSync(from);
                fs.open(to, 'w', function (err, fd) {
                    if (err) {
                        throw err;
                    }
                    ;
                    fs.futimes(fd, sourceStat.atime, sourceStat.mtime, function (err) {
                        if (err) {
                            throw err;
                        }
                        ;
                        fs.close(fd);
                        resolve();
                    });
                });
            }
            else {
                resolve();
            }
        });
        const size = fs.statSync(from).size;
        let progressStream = null;
        if (options && options.writeProgress && size > USE_PROGRESS_THRESHOLD) {
            progressStream = progress({
                length: fs.statSync(from).size,
                time: 100
            });
            let elapsed = Date.now();
            let speed = 0;
            const started = Date.now();
            progressStream.on('progress', (e) => {
                elapsed = (Date.now() - started) / 1000;
                speed = e.transferred / elapsed;
                options.writeProgress(from, e.transferred, e.length);
                if (options.debug) {
                    console.log('write ' + from + ' (' + e.transferred + ' of ' + e.length);
                }
            });
            if (options.throttel) {
                readStream.pipe(progressStream).pipe(new throttle(options.throttel)).pipe(writeStream);
            }
            else {
                readStream.pipe(progressStream).pipe(writeStream);
            }
        }
        else {
            if (options && options.debug) {
                console.log('write ' + from + ' to ' + to);
            }
            readStream.pipe(writeStream);
        }
    });
};
const copySymlinkAsync = (from, to) => {
    console.log('copy symlink! ' + from + ' to ' + to);
    return promisedReadlink(from)
        .then((symlinkPointsAt) => {
        return new Promise((resolve, reject) => {
            promisedSymlink(symlinkPointsAt, to)
                .then(resolve)
                .catch((err) => {
                if (err.code === interfaces_2.EError.EXISTS) {
                    // There is already file/symlink with this name on destination location.
                    // Must erase it manually, otherwise system won't allow us to place symlink there.
                    promisedUnlink(to)
                        .then(() => { return promisedSymlink(symlinkPointsAt, to); })
                        .then(resolve, reject);
                }
                else {
                    reject(err);
                }
            });
        });
    });
};
const copyItemAsync = (from, inspectData, to, options) => {
    const mode = mode_1.normalizeFileMode(inspectData.mode);
    if (inspectData.type === interfaces_1.ENodeType.DIR) {
        return promisedMkdirp(to, { mode: mode });
    }
    else if (inspectData.type === interfaces_1.ENodeType.FILE) {
        return copyFileAsync(from, to, mode, options);
    }
    else if (inspectData.type === interfaces_1.ENodeType.SYMLINK) {
        return copySymlinkAsync(from, to);
    }
    // EInspectItemType.OTHER
    return new Q();
};
// handle user side setting "THROW" and non enum values (null)
const onConflict = (from, to, options, settings) => {
    switch (settings.overwrite) {
        case interfaces_3.EResolveMode.THROW: {
            throw errors_1.ErrDestinationExists(to);
        }
        case interfaces_3.EResolveMode.OVERWRITE:
        case interfaces_3.EResolveMode.APPEND:
        case interfaces_3.EResolveMode.IF_NEWER:
        case interfaces_3.EResolveMode.ABORT:
        case interfaces_3.EResolveMode.IF_SIZE_DIFFERS:
        case interfaces_3.EResolveMode.SKIP: {
            return settings.overwrite;
        }
    }
    return undefined;
};
const resolveConflict = (from, to, options, resolveMode) => {
    // New logic for overwriting
    if (resolveMode !== undefined) {
        const src = inspect_1.createItem(from);
        const dst = inspect_1.createItem(to);
        if (resolveMode === interfaces_3.EResolveMode.SKIP) {
            return false;
        }
        else if (resolveMode === interfaces_3.EResolveMode.IF_NEWER) {
            if (dst.modifyTime.getTime() > src.modifyTime.getTime()) {
                return false;
            }
        }
        else if (resolveMode === interfaces_3.EResolveMode.IF_SIZE_DIFFERS) {
            // @TODO : not implemented: copy EInspectItemType.DIR with ECopyResolveMode.IF_SIZE_DIFFERS
            if (src.type === interfaces_1.ENodeType.DIR && dst.type === interfaces_1.ENodeType.DIR) {
            }
            else if (src.type === interfaces_1.ENodeType.FILE && dst.type === interfaces_1.ENodeType.FILE) {
                if (src.size === dst.size) {
                    return false;
                }
            }
        }
        else if (resolveMode === interfaces_3.EResolveMode.OVERWRITE) {
            return true;
        }
        else if (resolveMode === interfaces_3.EResolveMode.ABORT) {
            return false;
        }
    }
    return true;
};
/**
 * Copy
 * @export
 * @param {string} from
 * @param {string} to
 * @param {ICopyOptions} [options]
 * @returns
 */
function async(from, to, options) {
    const opts = parseOptions(options, from);
    return new Promise((resolve, reject) => {
        checkAsync(from, to, opts).then((resolveSettings) => {
            if (!resolveSettings) {
                resolveSettings = opts.conflictSettings || {
                    mode: interfaces_3.EResolve.THIS,
                    overwrite: interfaces_3.EResolveMode.OVERWRITE
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
            let onCopyErrorResolveSettings = null;
            if (options && options.flags && interfaces_1.ECopyFlags.EMPTY) {
                const dstStat = fs.statSync(to);
                if (dstStat.isDirectory()) {
                    dir_1.sync(to, {
                        empty: true
                    });
                }
            }
            function visitor() {
                if (abort) {
                    return resolve();
                }
                let stream = this;
                const item = stream.read();
                let rel;
                let destPath;
                if (!item) {
                    return;
                }
                rel = pathUtil.relative(from, item.path);
                destPath = pathUtil.resolve(to, rel);
                if (!opts.allowedToCopy(item.path)) {
                    return;
                }
                filesInProgress += 1;
                checkAsync(item.path, destPath, opts).then((subResolveSettings) => {
                    // if the first resolve callback returned an individual resolve settings "THIS",
                    // ask the user again with the particular item
                    let proceed = resolveSettings.mode === interfaces_3.EResolve.ALWAYS;
                    if (subResolveSettings) {
                        if (!proceed) {
                            let overwriteMode = subResolveSettings.overwrite;
                            overwriteMode = onConflict(item.path, destPath, options, subResolveSettings);
                            if (overwriteMode === interfaces_3.EResolveMode.ABORT) {
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
                    copyItemAsync(item.path, item.item, destPath, options).then(() => {
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
                    }).catch((err) => {
                        if (options && options.conflictCallback) {
                            if (err.code === interfaces_2.EError.PERMISSION || err.code === interfaces_2.EError.NOEXISTS) {
                                options.conflictCallback(item.path, inspect_1.createItem(destPath), err.code).then((errorResolveSettings) => {
                                    // the user has set the error resolver to always, so we use the last one
                                    if (onCopyErrorResolveSettings) {
                                        errorResolveSettings = onCopyErrorResolveSettings;
                                    }
                                    // user said use this settings always, we track and use this last setting from now on
                                    if (errorResolveSettings.mode === interfaces_3.EResolve.ALWAYS && !onCopyErrorResolveSettings) {
                                        onCopyErrorResolveSettings = errorResolveSettings;
                                    }
                                    if (errorResolveSettings.overwrite === interfaces_3.EResolveMode.ABORT) {
                                        abort = true;
                                        return resolve();
                                    }
                                    if (errorResolveSettings.overwrite === interfaces_3.EResolveMode.THROW) {
                                        abort = true;
                                        return reject(err);
                                    }
                                    if (errorResolveSettings.overwrite === interfaces_3.EResolveMode.SKIP) {
                                        filesInProgress -= 1;
                                    }
                                    // catch modes which make no sense:
                                    if (errorResolveSettings.overwrite === interfaces_3.EResolveMode.IF_NEWER ||
                                        errorResolveSettings.overwrite === interfaces_3.EResolveMode.IF_SIZE_DIFFERS ||
                                        errorResolveSettings.overwrite === interfaces_3.EResolveMode.OVERWRITE) {
                                        reject(new interfaces_2.ErrnoException('settings make no sense'));
                                    }
                                });
                            }
                        }
                        reject(err);
                    });
                });
            }
            tree_walker_1.stream(from, {
                inspectOptions: {
                    mode: true,
                    symlinks: options ? options.flags & interfaces_1.ECopyFlags.FOLLOW_SYMLINKS ? false : true : true
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
}
exports.async = async;
;
//# sourceMappingURL=copy.js.map
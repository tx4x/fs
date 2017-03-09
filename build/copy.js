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
const errors_1 = require("./errors");
const interfaces_1 = require("./interfaces");
const interfaces_2 = require("./interfaces");
const inspect_1 = require("./inspect");
const remove_1 = require("./remove");
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
            const rd = fs_1.createReadStream(from).
                on("error", (err) => done(err));
            const str = progress({
                length: fs.statSync(from).size,
                time: 100
            }).on('progress', (e) => {
                elapsed = (Date.now() - started) / 1000;
                speed = e.transferred / elapsed;
                options.writeProgress(from, e.transferred, e.length);
            });
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
    let sizeTotal = 0;
    if (options && options.flags & interfaces_1.ECopyFlags.EMPTY) {
        const dstStat = fs.statSync(to);
        if (dstStat.isDirectory()) {
            remove_1.sync(to);
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
            // feature: preserve times
            if (options && options.flags & interfaces_1.ECopyFlags.PRESERVE_TIMES) {
                const sourceStat = fs.statSync(from);
                fs.open(to, 'w', (err, fd) => {
                    if (err) {
                        throw err;
                    }
                    ;
                    fs.futimes(fd, sourceStat.atime, sourceStat.mtime, (err) => {
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
function copySymlinkAsync(from, to) {
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
}
exports.copySymlinkAsync = copySymlinkAsync;
;
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
function resolveConflict(from, to, options, resolveMode) {
    // New logic for overwriting
    if (resolveMode === undefined) {
        return true;
    }
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
exports.resolveConflict = resolveConflict;
;
/**
 * A callback for treeWalkerStream. This is called when a node has been found.
 *
 * @param {string} from
 * @param {string} to
 * @param {*} vars
 * @param {{ path: string, item: INode }} item
 * @returns {Promise<void>}
 */
function visitor(from, to, vars, item) {
    return __awaiter(this, void 0, void 0, function* () {
        const options = vars.options;
        let rel;
        let destPath;
        if (!item) {
            return;
        }
        rel = pathUtil.relative(from, item.path);
        destPath = pathUtil.resolve(to, rel);
        if (!options.allowedToCopy(item.path)) {
            return;
        }
        vars.filesInProgress += 1;
        vars['current'] = from;
        // our main function after sanity checks
        const checked = (subResolveSettings) => {
            // if the first resolve callback returned an individual resolve settings "THIS",
            // ask the user again with the same item
            let proceed = vars.resolveSettings.mode === interfaces_3.EResolve.ALWAYS;
            if (subResolveSettings) {
                if (!proceed) {
                    let overwriteMode = subResolveSettings.overwrite;
                    overwriteMode = onConflict(item.path, destPath, options, subResolveSettings);
                    if (overwriteMode === interfaces_3.EResolveMode.ABORT) {
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
            }).catch((err) => {
                if (options && options.conflictCallback) {
                    if (err.code === interfaces_2.EError.PERMISSION || err.code === interfaces_2.EError.NOEXISTS) {
                        options.conflictCallback(item.path, inspect_1.createItem(destPath), err.code).then((errorResolveSettings) => {
                            // the user has set the error resolver to always, so we use the last one
                            if (vars.onCopyErrorResolveSettings) {
                                errorResolveSettings = vars.onCopyErrorResolveSettings;
                            }
                            // user said use this settings always, we track and use this last setting from now on
                            if (errorResolveSettings.mode === interfaces_3.EResolve.ALWAYS && !vars.onCopyErrorResolveSettings) {
                                vars.onCopyErrorResolveSettings = errorResolveSettings;
                            }
                            if (errorResolveSettings.overwrite === interfaces_3.EResolveMode.ABORT) {
                                vars.abort = true;
                                return vars.resolve();
                            }
                            if (errorResolveSettings.overwrite === interfaces_3.EResolveMode.THROW) {
                                vars.abort = true;
                                return vars.reject(err);
                            }
                            if (errorResolveSettings.overwrite === interfaces_3.EResolveMode.SKIP) {
                                vars.filesInProgress -= 1;
                            }
                            // user error, should never happen, unintended
                            if (errorResolveSettings.overwrite === interfaces_3.EResolveMode.IF_NEWER ||
                                errorResolveSettings.overwrite === interfaces_3.EResolveMode.IF_SIZE_DIFFERS ||
                                errorResolveSettings.overwrite === interfaces_3.EResolveMode.OVERWRITE) {
                                vars.reject(new interfaces_2.ErrnoException('settings make no sense : errorResolveSettings.overwrite = ' + errorResolveSettings.overwrite));
                            }
                        });
                    }
                }
                vars.reject(err);
            });
        };
        return checkAsync(item.path, destPath, options).then(checked);
    });
}
/**
 * Final async copy function
 * @export
 * @param {string} from
 * @param {string} to
 * @param {ICopyOptions} [options]
 * @returns
 */
function async(from, to, options) {
    options = parseOptions(options, from);
    return new Promise((resolve, reject) => {
        checkAsync(from, to, options).then((resolver) => {
            if (!resolver) {
                resolver = options.conflictSettings || {
                    mode: interfaces_3.EResolve.THIS,
                    overwrite: interfaces_3.EResolveMode.OVERWRITE
                };
            }
            let overwriteMode = resolver.overwrite;
            overwriteMode = onConflict(from, to, options, resolver);
            if (options.conflictSettings || options.conflictCallback && !resolveConflict(from, to, options, overwriteMode)) {
                return resolve();
            }
            // feature: clean before
            if (options && options.flags & interfaces_1.ECopyFlags.EMPTY) {
                const dstStat = fs.statSync(to);
                if (dstStat.isDirectory()) {
                    remove_1.sync(to);
                }
            }
            // walker variables
            const visitorArgs = {
                resolve: resolve,
                reject: reject,
                abort: false,
                filesInProgress: 0,
                allFilesDelivered: false,
                resolveSettings: resolver,
                options: options
            };
            let nodes = [];
            // This function is being called each time when the treeWalkerStream got an item!
            // Now instead of calling the 'vistitor', we only collect the item.
            // The reason why we collect and then process each serial is because the
            // conflictCallback needs to be excecuted one by one
            const collector = function () {
                const stream = this;
                const item = stream.read();
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
            tree_walker_1.stream(from, {
                inspectOptions: {
                    mode: true,
                    symlinks: options ? options.flags & interfaces_1.ECopyFlags.FOLLOW_SYMLINKS ? false : true : true
                }
            }).on('readable', function () { return collector.apply(this, arguments); })
                .on('error', reject)
                .on('end', () => {
                process();
                // a case when nothing matched
                if (nodes.length === 0 && visitorArgs.filesInProgress === 0) {
                    resolve();
                }
            });
        }).catch(reject);
    });
}
exports.async = async;
;
//# sourceMappingURL=copy.js.map
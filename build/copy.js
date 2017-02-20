"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const pathUtil = require("path");
const fs = require("fs");
const fs_1 = require("fs");
const Q = require("q");
const mkdirp = require("mkdirp");
const exists_1 = require("./exists");
const matcher_1 = require("./utils/matcher");
const mode_1 = require("./utils/mode");
const tree_walker_1 = require("./utils/tree_walker");
const validate_1 = require("./utils/validate");
const write_1 = require("./write");
const progress = require("progress-stream");
const interfaces_1 = require("./interfaces");
const promisedSymlink = Q.denodeify(fs.symlink);
const promisedReadlink = Q.denodeify(fs.readlink);
const promisedUnlink = Q.denodeify(fs.unlink);
const promisedMkdirp = Q.denodeify(mkdirp);
function validateInput(methodName, from, to, options) {
    const methodSignature = methodName + '(from, to, [options])';
    validate_1.validateArgument(methodSignature, 'from', from, ['string']);
    validate_1.validateArgument(methodSignature, 'to', to, ['string']);
    validate_1.validateOptions(methodSignature, 'options', options, {
        overwrite: ['boolean'],
        matching: ['string', 'array of string'],
        progress: ['function'],
        writeProgress: ['function']
    });
}
exports.validateInput = validateInput;
;
function parseOptions(options, from) {
    const opts = options || {};
    const parsedOptions = {};
    parsedOptions.overwrite = opts.overwrite;
    parsedOptions.progress = opts.progress;
    parsedOptions.writeProgress = opts.writeProgress;
    if (opts.matching) {
        parsedOptions.allowedToCopy = matcher_1.create(from, opts.matching);
    }
    else {
        parsedOptions.allowedToCopy = () => { return true; };
    }
    return parsedOptions;
}
;
const ErrDoesntExists = (path) => {
    const err = new Error("Path to copy doesn't exist " + path);
    err.code = 'ENOENT';
    return err;
};
const ErrDestinationExists = (path) => {
    const err = new Error('Destination path already exists ' + path);
    err.code = 'EEXIST';
    return err;
};
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
function checksBeforeCopyingSync(from, to, options) {
    if (!exists_1.sync(from)) {
        throw ErrDoesntExists(from);
    }
    if (exists_1.sync(to) && !options.overwrite) {
        throw ErrDestinationExists(to);
    }
}
;
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
            str.on('progress', e => {
                elapsed = (Date.now() - started) / 1000;
                speed = e.transferred / elapsed;
                options.writeProgress(from, e.transferred, e.length);
            });
            rd.on("error", err => done(err));
            const wr = fs_1.createWriteStream(to);
            wr.on("error", err => done(err));
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
function copySymlinkSync(from, to) {
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
}
;
function copyItemSync(from, inspectData, to, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const mode = mode_1.normalizeFileMode(inspectData.mode);
        if (inspectData.type === interfaces_1.EInspectItemType.DIR) {
            mkdirp.sync(to, { mode: parseInt(mode, 8), fs: null });
        }
        else if (inspectData.type === interfaces_1.EInspectItemType.FILE) {
            yield copyFileSync(from, to, mode, options);
        }
        else if (inspectData.type === interfaces_1.EInspectItemType.SYMLINK) {
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
    const visitor = function (path, inspectData) {
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
const check = (from, to, opts) => {
    return exists_1.async(from)
        .then(srcPathExists => {
        if (!srcPathExists) {
            throw ErrDoesntExists(from);
        }
        else {
            return exists_1.async(to);
        }
    })
        .then(destPathExists => {
        if (destPathExists && !opts.overwrite) {
            throw ErrDestinationExists(to);
        }
    });
};
const copyFileAsync = (from, to, mode, retriedAttempt) => {
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
        writeStream.on('finish', resolve);
        readStream.pipe(writeStream);
    });
};
function copySymlinkAsync(from, to) {
    return promisedReadlink(from)
        .then((symlinkPointsAt) => {
        return new Promise((resolve, reject) => {
            promisedSymlink(symlinkPointsAt, to)
                .then(resolve)
                .catch(err => {
                if (err.code === 'EEXIST') {
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
;
function copyItemAsync(from, inspectData, to) {
    const mode = mode_1.normalizeFileMode(inspectData.mode);
    if (inspectData.type === interfaces_1.EInspectItemType.DIR) {
        return promisedMkdirp(to, { mode: mode });
    }
    else if (inspectData.type === interfaces_1.EInspectItemType.FILE) {
        return copyFileAsync(from, to, mode);
    }
    else if (inspectData.type === interfaces_1.EInspectItemType.SYMLINK) {
        return copySymlinkAsync(from, to);
    }
    //EInspectItemType.OTHER
    return new Q();
}
;
function async(from, to, options) {
    const opts = parseOptions(options, from);
    return new Promise((resolve, reject) => {
        check(from, to, opts).then(() => {
            let allFilesDelivered = false;
            let filesInProgress = 0;
            const stream = tree_walker_1.stream(from, {
                inspectOptions: {
                    mode: true,
                    symlinks: true
                }
            }).on('readable', () => {
                const item = stream.read();
                let rel;
                let destPath;
                if (item) {
                    rel = pathUtil.relative(from, item.path);
                    destPath = pathUtil.resolve(to, rel);
                    if (opts.allowedToCopy(item.path)) {
                        filesInProgress += 1;
                        copyItemAsync(item.path, item.item, destPath)
                            .then(() => {
                            filesInProgress -= 1;
                            if (allFilesDelivered && filesInProgress === 0) {
                                resolve();
                            }
                        })
                            .catch(reject);
                    }
                }
            }).on('error', reject)
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
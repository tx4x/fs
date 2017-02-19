"use strict";
const fs_1 = require("fs");
const pathUtil = require("path");
const validate_1 = require("./utils/validate");
const crypto_1 = require("crypto");
const promisify_1 = require("./promisify");
const Q = require("q");
exports.supportedChecksumAlgorithms = ['md5', 'sha1', 'sha256', 'sha512'];
var EItemType;
(function (EItemType) {
    EItemType[EItemType["FILE"] = 'file'] = "FILE";
    EItemType[EItemType["DIR"] = 'dir'] = "DIR";
    EItemType[EItemType["SYMLINK"] = 'symlink'] = "SYMLINK";
    EItemType[EItemType["OTHER"] = 'other'] = "OTHER";
})(EItemType = exports.EItemType || (exports.EItemType = {}));
function validateInput(methodName, path, options) {
    const methodSignature = methodName + '(path, [options])';
    validate_1.validateArgument(methodSignature, 'path', path, ['string']);
    validate_1.validateOptions(methodSignature, 'options', options, {
        checksum: ['string'],
        mode: ['boolean'],
        times: ['boolean'],
        absolutePath: ['boolean'],
        symlinks: ['boolean']
    });
    if (options && options.checksum !== undefined
        && exports.supportedChecksumAlgorithms.indexOf(options.checksum) === -1) {
        throw new Error('Argument "options.checksum" passed to ' + methodSignature
            + ' must have one of values: ' + exports.supportedChecksumAlgorithms.join(', '));
    }
}
exports.validateInput = validateInput;
;
function createInspectObj(path, options, stat) {
    let obj = {};
    obj.name = pathUtil.basename(path);
    if (stat.isFile()) {
        obj.type = EItemType.FILE;
        obj.size = stat.size;
    }
    else if (stat.isDirectory()) {
        obj.type = EItemType.DIR;
    }
    else if (stat.isSymbolicLink()) {
        obj.type = EItemType.SYMLINK;
    }
    else {
        obj.type = EItemType.OTHER;
    }
    if (options.mode) {
        obj.mode = stat.mode;
    }
    if (options.times) {
        obj.accessTime = stat.atime;
        obj.modifyTime = stat.mtime;
        obj.changeTime = stat.ctime;
    }
    if (options.absolutePath) {
        obj.absolutePath = path;
    }
    return obj;
}
;
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
function fileChecksum(path, algo) {
    const hash = crypto_1.createHash(algo);
    const data = fs_1.readFileSync(path);
    hash.update(data);
    return hash.digest('hex');
}
;
function addExtraFieldsSync(path, inspectObj, options) {
    if (inspectObj.type === 'file' && options.checksum) {
        inspectObj[options.checksum] = fileChecksum(path, options.checksum);
    }
    else if (inspectObj.type === 'symlink') {
        inspectObj.pointsAt = fs_1.readlinkSync(path);
    }
}
;
function sync(path, options) {
    let statOperation = fs_1.statSync;
    let stat;
    let inspectObj;
    options = options || {};
    if (options.symlinks) {
        statOperation = fs_1.lstatSync;
    }
    try {
        stat = statOperation(path);
    }
    catch (err) {
        // Detection if path exists
        if (err.code === 'ENOENT') {
            // Doesn't exist. Return undefined instead of throwing.
            return undefined;
        }
        throw err;
    }
    inspectObj = createInspectObj(path, options, stat);
    addExtraFieldsSync(path, inspectObj, options);
    return inspectObj;
}
exports.sync = sync;
;
// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
const promisedStat = promisify_1.promisify(fs_1.stat);
const promisedLstat = promisify_1.promisify(fs_1.lstat);
const promisedReadlink = promisify_1.promisify(fs_1.readlink);
function fileChecksumAsync(path, algo) {
    //return new Promise((resolve, reject) => {
    const deferred = Q.defer();
    const hash = crypto_1.createHash(algo);
    const s = fs_1.createReadStream(path);
    s.on('data', data => {
        hash.update(data);
    });
    s.on('end', function () {
        deferred.resolve(hash.digest('hex'));
    });
    s.on('error', function (e) {
        deferred.reject(e);
    });
    return deferred.promise;
}
;
function addExtraFieldsAsync(path, inspectObj, options) {
    if (inspectObj.type === 'file' && options.checksum) {
        return fileChecksumAsync(path, options.checksum)
            .then(function (checksum) {
            inspectObj[options.checksum] = checksum;
            return inspectObj;
        });
    }
    else if (inspectObj.type === 'symlink') {
        return promisedReadlink(path)
            .then(function (linkPath) {
            inspectObj.pointsAt = linkPath;
            return inspectObj;
        });
    }
    return new Q(inspectObj);
}
function async(path, options) {
    return new Promise((resolve, reject) => {
        let statOperation = promisedStat;
        options = options || {};
        if (options.symlinks) {
            statOperation = promisedLstat;
        }
        statOperation(path)
            .then(function (stat) {
            let inspectObj = createInspectObj(path, options, stat);
            addExtraFieldsAsync(path, inspectObj, options).then(resolve, reject);
        })
            .catch(function (err) {
            // Detection if path exists
            if (err.code === 'ENOENT') {
                // Doesn't exist. Return undefined instead of throwing.
                resolve(undefined);
            }
            else {
                reject(err);
            }
        });
    });
}
exports.async = async;
//# sourceMappingURL=inspect.js.map
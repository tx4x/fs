"use strict";
//import * as fs from 'fs';
const fs_1 = require("fs");
const pathUtil = require("path");
const Q = require("q");
const validate_1 = require("./utils/validate");
const crypto_1 = require("crypto");
exports.supportedChecksumAlgorithms = ['md5', 'sha1', 'sha256', 'sha512'];
function validateInput(methodName, path, options) {
    const methodSignature = methodName + '(path, [options])';
    validate_1.argument(methodSignature, 'path', path, ['string']);
    options(methodSignature, 'options', options, {
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
        obj.type = 'file';
        obj.size = stat.size;
    }
    else if (stat.isDirectory()) {
        obj.type = 'dir';
    }
    else if (stat.isSymbolicLink()) {
        obj.type = 'symlink';
    }
    else {
        obj.type = 'other';
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
const promisedStat = Q.denodeify(fs_1.stat);
const promisedLstat = Q.denodeify(fs_1.lstat);
const promisedReadlink = Q.denodeify(fs_1.readlink);
function fileChecksumAsync(path, algo) {
    return new Promise((resolve, reject) => {
        const hash = crypto_1.createHash(algo);
        const s = fs_1.createReadStream(path);
        s.on('data', data => {
            hash.update(data);
        });
        s.on('end', () => {
            resolve(hash.digest('hex'));
        });
        s.on('error', reject);
    });
}
;
function addExtraFieldsAsync(path, inspectObj, options) {
    return new Promise((resolve, reject) => {
        if (inspectObj.type === 'file' && options.checksum) {
            return fileChecksumAsync(path, options.checksum)
                .then(checksum => {
                inspectObj[options.checksum] = checksum;
                return inspectObj;
            });
        }
        else if (inspectObj.type === 'symlink') {
            return promisedReadlink(path)
                .then(linkPath => {
                inspectObj.pointsAt = linkPath;
                return inspectObj;
            });
        }
    });
}
;
function async(path, options) {
    var deferred = Q.defer();
    var statOperation = promisedStat;
    options = options || {};
    if (options.symlinks) {
        statOperation = promisedLstat;
    }
    statOperation(path)
        .then(function (stat) {
        var inspectObj = createInspectObj(path, options, stat);
        addExtraFieldsAsync(path, inspectObj, options)
            .then(deferred.resolve, deferred.reject);
    })
        .catch(function (err) {
        // Detection if path exists
        if (err.code === 'ENOENT') {
            // Doesn't exist. Return undefined instead of throwing.
            deferred.resolve(undefined);
        }
        else {
            deferred.reject(err);
        }
    });
    return deferred.promise;
}
exports.async = async;
;
//# sourceMappingURL=inspect.js.map
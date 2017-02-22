"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const fs_1 = require("fs");
const pathUtil = require("path");
const validate_1 = require("./utils/validate");
const crypto_1 = require("crypto");
const interfaces_1 = require("./interfaces");
const Q = require('q');
const denodeify = require("denodeify");
exports.supportedChecksumAlgorithms = ['md5', 'sha1', 'sha256', 'sha512'];
const promisedStat = denodeify(fs_1.stat);
const promisedLstat = denodeify(fs_1.lstat);
const promisedReadlink = denodeify(fs_1.readlink);
function DefaultInspectOptions() {
    return {
        times: true,
        mode: true
    };
}
exports.DefaultInspectOptions = DefaultInspectOptions;
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
const createInspectObj = (path, options, stat) => {
    let obj = {};
    obj.name = pathUtil.basename(path);
    if (stat.isFile()) {
        obj.type = interfaces_1.ENodeType.FILE;
        obj.size = stat.size;
    }
    else if (stat.isDirectory()) {
        obj.type = interfaces_1.ENodeType.DIR;
    }
    else if (stat.isSymbolicLink()) {
        obj.type = interfaces_1.ENodeType.SYMLINK;
    }
    else {
        obj.type = interfaces_1.ENodeType.OTHER;
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
};
function createItem(path, options) {
    options = options || DefaultInspectOptions();
    const stat = (options.symlinks ? fs_1.lstatSync : fs_1.statSync)(path);
    return createInspectObj(path, options, stat);
}
exports.createItem = createItem;
;
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
const fileChecksum = (path, algo) => {
    const hash = crypto_1.createHash(algo);
    const data = fs_1.readFileSync(path);
    hash.update(data);
    return hash.digest('hex');
};
const addExtraFieldsSync = (path, inspectObj, options) => {
    if (inspectObj.type === interfaces_1.ENodeType.FILE && options.checksum) {
        inspectObj[options.checksum] = fileChecksum(path, options.checksum);
    }
    else if (inspectObj.type === interfaces_1.ENodeType.SYMLINK) {
        inspectObj.pointsAt = fs_1.readlinkSync(path);
    }
    return inspectObj;
};
function sync(path, options) {
    let stat;
    let inspectObj;
    options = options || {};
    try {
        stat = (options.symlinks ? fs_1.lstatSync : fs_1.statSync)(path);
    }
    catch (err) {
        // Detection if path exists
        if (err.code === 'ENOENT') {
            // Doesn't exist. Return undefined instead of throwing.
            return undefined;
        }
        throw err;
    }
    return addExtraFieldsSync(path, createInspectObj(path, options, stat), options);
}
exports.sync = sync;
;
// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
function fileChecksumAsync(path, algo) {
    return __awaiter(this, void 0, void 0, function* () {
        const deferred = Q.defer();
        const hash = crypto_1.createHash(algo);
        const s = fs_1.createReadStream(path);
        s.on('data', (data) => hash.update(data));
        s.on('end', () => deferred.resolve(hash.digest('hex')));
        s.on('error', (e) => deferred.reject(e));
        return deferred.promise;
    });
}
;
const addExtraFieldsAsync = (path, inspectObj, options) => {
    if (inspectObj.type === interfaces_1.ENodeType.FILE && options.checksum) {
        return fileChecksumAsync(path, options.checksum)
            .then(checksum => {
            inspectObj.checksum = checksum;
            return inspectObj;
        });
    }
    else if (inspectObj.type === interfaces_1.ENodeType.SYMLINK) {
        return promisedReadlink(path)
            .then(linkPath => {
            inspectObj.pointsAt = linkPath;
            return inspectObj;
        });
    }
    return new Q(inspectObj);
};
function async(path, options) {
    return new Promise((resolve, reject) => {
        options = options || {};
        (options.symlinks ? promisedLstat : promisedStat)(path)
            .then((stat) => { addExtraFieldsAsync(path, createInspectObj(path, options, stat), options).then(resolve, reject); })
            .catch(err => (err.code === 'ENOENT' ? resolve(undefined) : reject(err)));
    });
}
exports.async = async;
//# sourceMappingURL=inspect.js.map
"use strict";
const Q = require("q");
const fs = require("fs");
const mkdirp = require("mkdirp");
const pathUtil = require("path");
const validate_1 = require("./utils/validate");
const promisedSymlink = Q.denodeify(fs.symlink);
const promisedMkdirp = Q.denodeify(mkdirp);
function validateInput(methodName, symlinkValue, path) {
    const methodSignature = methodName + '(symlinkValue, path)';
    validate_1.validateArgument(methodSignature, 'symlinkValue', symlinkValue, ['string']);
    validate_1.validateArgument(methodSignature, 'path', path, ['string']);
}
exports.validateInput = validateInput;
;
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
function sync(symlinkValue, path) {
    try {
        fs.symlinkSync(symlinkValue, path);
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            // Parent directories don't exist. Just create them and rety.
            mkdirp.sync(pathUtil.dirname(path));
            fs.symlinkSync(symlinkValue, path);
        }
        else {
            throw err;
        }
    }
}
exports.sync = sync;
// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
function async(symlinkValue, path) {
    return new Promise((resolve, reject) => {
        promisedSymlink(symlinkValue, path)
            .then(resolve)
            .catch(err => {
            if (err.code === 'ENOENT') {
                // Parent directories don't exist. Just create them and rety.
                promisedMkdirp(pathUtil.dirname(path))
                    .then(() => { return promisedSymlink(symlinkValue, path); })
                    .then(resolve, reject);
            }
            else {
                reject(err);
            }
        });
    });
}
exports.async = async;
//# sourceMappingURL=symlink.js.map
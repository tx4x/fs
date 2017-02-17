"use strict";
const pathUtil = require("path");
const fs = require("fs");
const Q = require("q");
const mkdirp_1 = require("mkdirp");
const exists_1 = require("./exists");
const validate_1 = require("./utils/validate");
function validateInput(methodName, from, to) {
    const methodSignature = methodName + '(from, to)';
    validate_1.validateArgument(methodSignature, 'from', from, ['string']);
    validate_1.validateArgument(methodSignature, 'to', to, ['string']);
}
exports.validateInput = validateInput;
;
function generateSourceDoesntExistError(path) {
    const err = new Error("Path to move doesn't exist " + path);
    err['code'] = 'ENOENT';
    return err;
}
;
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
function sync(from, to) {
    try {
        fs.renameSync(from, to);
    }
    catch (err) {
        if (err.code !== 'ENOENT') {
            // We can't make sense of this error. Rethrow it.
            throw err;
        }
        else {
            // Ok, source or destination path doesn't exist.
            // Must do more investigation.
            if (!exists_1.sync(from)) {
                throw generateSourceDoesntExistError(from);
            }
            if (!exists_1.sync(to)) {
                // Some parent directory doesn't exist. Create it.
                mkdirp_1.sync(pathUtil.dirname(to));
                // Retry the attempt
                fs.renameSync(from, to);
            }
        }
    }
}
exports.sync = sync;
;
// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
var promisedRename = Q.denodeify(fs.rename);
var promisedMkdirp = Q.denodeify(mkdirp_1.sync);
function ensureDestinationPathExistsAsync(to) {
    return new Promise((resolve, reject) => {
        let destDir = pathUtil.dirname(to);
        exists_1.async(destDir)
            .then(dstExists => {
            if (!dstExists) {
                promisedMkdirp(destDir)
                    .then(resolve, reject);
            }
            else {
                // Hah, no idea.
                reject();
            }
        })
            .catch(reject);
    });
}
;
function async(from, to) {
    return new Promise((resolve, reject) => {
        promisedRename(from, to)
            .then(resolve)
            .catch(err => {
            if (err.code !== 'ENOENT') {
                // Something unknown. Rethrow original error.
                reject(err);
            }
            else {
                // Ok, source or destination path doesn't exist.
                // Must do more investigation.
                exists_1.async(from)
                    .then(srcExists => {
                    if (!srcExists) {
                        reject(generateSourceDoesntExistError(from));
                    }
                    else {
                        ensureDestinationPathExistsAsync(to)
                            .then(() => {
                            // Retry the attempt
                            return promisedRename(from, to);
                        })
                            .then(resolve, reject);
                    }
                })
                    .catch(reject);
            }
        });
    });
}
exports.async = async;
;
//# sourceMappingURL=move.js.map
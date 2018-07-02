"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pathUtil = require("path");
const fs_1 = require("fs");
const exists_1 = require("./exists");
const validate_1 = require("./utils/validate");
const errors_1 = require("./errors");
const interfaces_1 = require("./interfaces");
const copy_1 = require("./copy");
const remove_1 = require("./remove");
const util_1 = require("util");
const dir_1 = require("./dir");
exports.validateInput = (methodName, from, to) => {
    const methodSignature = methodName + '(from, to)';
    validate_1.validateArgument(methodSignature, 'from', from, ['string']);
    validate_1.validateArgument(methodSignature, 'to', to, ['string']);
};
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
exports.sync = (from, to) => {
    try {
        fs_1.renameSync(from, to);
    }
    catch (err) {
        // not the same device, rename doesnt work here
        if (err.code === interfaces_1.EError.CROSS_DEVICE) {
            try {
                copy_1.sync(from, to);
            }
            catch (e) {
                throw e;
            }
            try {
                remove_1.sync(from);
            }
            catch (e) {
                throw e;
            }
            return;
        }
        if (err.code !== interfaces_1.EError.NOEXISTS) {
            // We can't make sense of this error. Rethrow it.
            throw err;
        }
        else {
            // Ok, source or destination path doesn't exist.
            // Must do more investigation.
            if (!exists_1.sync(from)) {
                throw errors_1.ErrDoesntExists(from);
            }
            if (!exists_1.sync(to)) {
                // Some parent directory doesn't exist. Create it.
                dir_1.sync(pathUtil.dirname(to));
                // Retry the attempt
                fs_1.renameSync(from, to);
            }
        }
    }
};
// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
const ensureDestinationPathExistsAsync = (to) => {
    return new Promise((resolve, reject) => {
        const destDir = pathUtil.dirname(to);
        exists_1.async(destDir)
            .then(dstExists => {
            if (!dstExists) {
                dir_1.async(destDir).then(resolve, reject);
            }
            else {
                // Hah, no idea.
                reject();
            }
        })
            .catch(reject);
    });
};
exports.async = (from, to) => {
    return new Promise((resolve, reject) => {
        util_1.promisify(fs_1.rename)(from, to)
            .then(resolve)
            .catch(err => {
            if (err.code !== interfaces_1.EError.NOEXISTS) {
                // Something unknown. Rethrow original error.
                reject(err);
            }
            else {
                // Ok, source or destination path doesn't exist.
                // Must do more investigation.
                exists_1.async(from)
                    .then(srcExists => {
                    if (!srcExists) {
                        reject(errors_1.ErrDoesntExists(from));
                    }
                    else {
                        ensureDestinationPathExistsAsync(to)
                            // Retry the attempt
                            .then(() => util_1.promisify(fs_1.rename)(from, to))
                            .then(resolve, reject);
                    }
                })
                    .catch(reject);
            }
        });
    });
};
//# sourceMappingURL=move.js.map
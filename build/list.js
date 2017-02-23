"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const denodeify = require("denodeify");
const validate_1 = require("./utils/validate");
function validateInput(methodName, path) {
    const methodSignature = methodName + '(path)';
    validate_1.validateArgument(methodSignature, 'path', path, ['string', 'undefined']);
}
exports.validateInput = validateInput;
;
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
function sync(path) {
    try {
        return fs_1.readdirSync(path);
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            // Doesn't exist. Return undefined instead of throwing.
            return undefined;
        }
        throw err;
    }
}
exports.sync = sync;
;
// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
const promisedReaddir = denodeify(fs_1.readdir);
function async(path) {
    return new Promise((resolve, reject) => {
        promisedReaddir(path)
            .then((list) => resolve(list))
            .catch(err => (err.code === 'ENOENT' ? resolve(undefined) : reject(err)));
    });
}
exports.async = async;
;
//# sourceMappingURL=list.js.map
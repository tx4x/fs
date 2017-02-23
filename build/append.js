"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const Q = require('q');
const write_1 = require("./write");
const validate_1 = require("./utils/validate");
function validateInput(methodName, path, data, options) {
    const methodSignature = methodName + '(path, data, [options])';
    validate_1.validateArgument(methodSignature, 'path', path, ['string']);
    validate_1.validateArgument(methodSignature, 'data', data, ['string', 'buffer']);
    validate_1.validateOptions(methodSignature, 'options', options, {
        mode: ['string', 'number']
    });
}
exports.validateInput = validateInput;
;
// ---------------------------------------------------------
// SYNC
// ---------------------------------------------------------
function sync(path, data, options) {
    try {
        fs.appendFileSync(path, data, options ? { encoding: options.encoding, mode: options.mode } : {});
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            // Parent directory doesn't exist, so just pass the task to `write`,
            // which will create the folder and file.
            write_1.sync(path, data, options);
        }
        else {
            throw err;
        }
    }
}
exports.sync = sync;
;
// ---------------------------------------------------------
// ASYNC
// ---------------------------------------------------------
const promisedAppendFile = Q.denodeify(fs.appendFile);
function async(path, data, options) {
    return new Promise((resolve, reject) => {
        promisedAppendFile(path, data, options)
            .then(resolve)
            .catch((err) => {
            if (err.code === 'ENOENT') {
                // Parent directory doesn't exist, so just pass the task to `write`,
                // which will create the folder and file.
                write_1.async(path, data, options).then(resolve, reject);
            }
            else {
                reject(err);
            }
        });
    });
}
exports.async = async;
;
//# sourceMappingURL=append.js.map
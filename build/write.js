"use strict";
const pathUtil = require("path");
const fs = require("fs");
const Q = require("q");
const mkdirp = require("mkdirp");
const validate_1 = require("./utils/validate");
function validateInput(methodName, path, data, options) {
    let methodSignature = methodName + '(path, data, [options])';
    validate_1.validateArgument(methodSignature, 'path', path, ['string']);
    validate_1.validateArgument(methodSignature, 'data', data, ['string', 'buffer', 'object', 'array']);
    validate_1.validateOptions(methodSignature, 'options', options, {
        atomic: ['boolean'],
        jsonIndent: ['number'],
        progress: ['function']
    });
}
exports.validateInput = validateInput;
;
// Temporary file extensions used for atomic file overwriting.
const newExt = '.__new__';
function serializeToJsonMaybe(data, jsonIndent) {
    let indent = jsonIndent;
    if (typeof indent !== 'number') {
        indent = 2;
    }
    if (typeof data === 'object'
        && !Buffer.isBuffer(data)
        && data !== null) {
        return JSON.stringify(data, null, indent);
    }
    return data;
}
;
// ---------------------------------------------------------
// SYNC
// ---------------------------------------------------------
function writeFileSync(path, data, options) {
    try {
        fs.writeFileSync(path, data, options);
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            // Means parent directory doesn't exist, so create it and try again.
            mkdirp.sync(pathUtil.dirname(path));
            fs.writeFileSync(path, data, options);
        }
        else {
            throw err;
        }
    }
}
;
function writeAtomicSync(path, data, options) {
    // we are assuming there is file on given path, and we don't want
    // to touch it until we are sure our data has been saved correctly,
    // so write the data into temporary file...
    writeFileSync(path + newExt, data, options);
    // ...next rename temp file to replace real path.
    fs.renameSync(path + newExt, path);
}
;
function sync(path, data, options) {
    const opts = options || {};
    const processedData = serializeToJsonMaybe(data, opts.jsonIndent);
    let writeStrategy = writeFileSync;
    if (opts.atomic) {
        writeStrategy = writeAtomicSync;
    }
    writeStrategy(path, processedData, { mode: opts.mode });
}
exports.sync = sync;
;
// ---------------------------------------------------------
// ASYNC
// ---------------------------------------------------------
const promisedRename = Q.denodeify(fs.rename);
const promisedWriteFile = Q.denodeify(fs.writeFile);
const promisedMkdirp = Q.denodeify(mkdirp);
function writeFileAsync(path, data, options) {
    return new Promise((resolve, reject) => {
        promisedWriteFile(path, data, options)
            .then(resolve)
            .catch(function (err) {
            // First attempt to write a file ended with error.
            // Check if this is not due to nonexistent parent directory.
            if (err.code === 'ENOENT') {
                // Parent directory doesn't exist, so create it and try again.
                promisedMkdirp(pathUtil.dirname(path))
                    .then(function () {
                    return promisedWriteFile(path, data, options);
                })
                    .then(resolve, reject);
            }
            else {
                // Nope, some other error, throw it.
                reject(err);
            }
        });
    });
}
;
function writeAtomicAsync(path, data, options) {
    return new Promise((resolve, reject) => {
        // We are assuming there is file on given path, and we don't want
        // to touch it until we are sure our data has been saved correctly,
        // so write the data into temporary file...
        writeFileAsync(path + newExt, data, options)
            .then(function () {
            // ...next rename temp file to real path.
            return promisedRename(path + newExt, path);
        })
            .then(resolve, reject);
    });
}
function async(path, data, options) {
    let opts = options || {};
    let processedData = serializeToJsonMaybe(data, opts.jsonIndent);
    let writeStrategy = writeFileAsync;
    if (opts.atomic) {
        writeStrategy = writeAtomicAsync;
    }
    return writeStrategy(path, processedData, { mode: opts.mode });
}
exports.async = async;
;
//# sourceMappingURL=write.js.map
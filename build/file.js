"use strict";
const fs = require("fs");
const Q = require("q");
const mode_1 = require("./utils/mode");
const validate_1 = require("./utils/validate");
const write_1 = require("./write");
function validateInput(methodName, path, criteria) {
    const methodSignature = methodName + '(path, [criteria])';
    validate_1.validateArgument(methodSignature, 'path', path, ['string']);
    validate_1.validateOptions(methodSignature, 'criteria', criteria, {
        content: ['string', 'buffer', 'object', 'array'],
        jsonIndent: ['number'],
        mode: ['string', 'number']
    });
}
exports.validateInput = validateInput;
;
function getCriteriaDefaults(passedCriteria) {
    const criteria = passedCriteria || {};
    if (criteria.mode !== undefined) {
        criteria.mode = mode_1.normalizeFileMode(criteria.mode);
    }
    return criteria;
}
;
function generatePathOccupiedByNotFileError(path) {
    return new Error('Path ' + path + ' exists but is not a file.' +
        ' Halting jetpack.file() call for safety reasons.');
}
;
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
function checkWhatAlreadyOccupiesPathSync(path) {
    let stat;
    try {
        stat = fs.statSync(path);
    }
    catch (err) {
        // Detection if path exists
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
    if (stat && !stat.isFile()) {
        throw generatePathOccupiedByNotFileError(path);
    }
    return stat;
}
;
function checkExistingFileFulfillsCriteriaSync(path, stat, criteria) {
    const mode = mode_1.normalizeFileMode(stat.mode);
    const checkContent = function () {
        if (criteria.content !== undefined) {
            write_1.sync(path, criteria.content, {
                mode: mode,
                jsonIndent: criteria.jsonIndent
            });
            return true;
        }
        return false;
    };
    const checkMode = function () {
        if (criteria.mode !== undefined && criteria.mode !== mode) {
            fs.chmodSync(path, criteria.mode);
        }
    };
    const contentReplaced = checkContent();
    if (!contentReplaced) {
        checkMode();
    }
}
;
function createBrandNewFileSync(path, criteria) {
    let content = '';
    if (criteria.content !== undefined) {
        content = criteria.content;
    }
    write_1.sync(path, content, {
        mode: criteria.mode,
        jsonIndent: criteria.jsonIndent
    });
}
;
function sync(path, passedCriteria) {
    const criteria = getCriteriaDefaults(passedCriteria);
    const stat = checkWhatAlreadyOccupiesPathSync(path);
    if (stat !== undefined) {
        checkExistingFileFulfillsCriteriaSync(path, stat, criteria);
    }
    else {
        createBrandNewFileSync(path, criteria);
    }
}
exports.sync = sync;
;
// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
const promisedStat = Q.denodeify(fs.stat);
const promisedChmod = Q.denodeify(fs.chmod);
function checkWhatAlreadyOccupiesPathAsync(path) {
    return new Promise((resolve, reject) => {
        promisedStat(path)
            .then(stat => {
            if (stat.isFile()) {
                resolve(stat);
            }
            else {
                reject(generatePathOccupiedByNotFileError(path));
            }
        })
            .catch(err => {
            if (err.code === 'ENOENT') {
                // Path doesn't exist.
                resolve(undefined);
            }
            else {
                // This is other error. Must end here.
                reject(err);
            }
        });
    });
}
;
function checkExistingFileFulfillsCriteriaAsync(path, stat, criteria) {
    const mode = mode_1.normalizeFileMode(stat.mode);
    const checkContent = () => {
        return new Promise((resolve, reject) => {
            if (criteria.content !== undefined) {
                write_1.async(path, criteria.content, {
                    mode: mode,
                    jsonIndent: criteria.jsonIndent
                })
                    .then(() => {
                    resolve(true);
                })
                    .catch(reject);
            }
            else {
                resolve(false);
            }
        });
    };
    const checkMode = function () {
        if (criteria.mode !== undefined && criteria.mode !== mode) {
            return promisedChmod(path, criteria.mode);
        }
        return undefined;
    };
    return checkContent()
        .then(contentReplaced => {
        if (!contentReplaced) {
            return checkMode();
        }
        return undefined;
    });
}
;
function createBrandNewFileAsync(path, criteria) {
    let content = '';
    if (criteria.content !== undefined) {
        content = criteria.content;
    }
    return write_1.async(path, content, {
        mode: criteria.mode,
        jsonIndent: criteria.jsonIndent
    });
}
;
function async(path, passedCriteria) {
    return new Promise((resolve, reject) => {
        const criteria = getCriteriaDefaults(passedCriteria);
        checkWhatAlreadyOccupiesPathAsync(path)
            .then(stat => {
            if (stat !== undefined) {
                return checkExistingFileFulfillsCriteriaAsync(path, stat, criteria);
            }
            return createBrandNewFileAsync(path, criteria);
        })
            .then(resolve, reject);
    });
}
exports.async = async;
;
//# sourceMappingURL=file.js.map
"use strict";
const pathUtil = require("path");
const fs_1 = require("fs");
const Q = require('q');
const mkdirp_1 = require("mkdirp");
const rimraf = require("rimraf");
const mode_1 = require("./utils/mode");
const validate_1 = require("./utils/validate");
function validateInput(methodName, path, criteria) {
    const methodSignature = methodName + '(path, [criteria])';
    validate_1.argument(methodSignature, 'path', path, ['string']);
    validate_1.options(methodSignature, 'criteria', criteria, {
        empty: ['boolean'],
        mode: ['string', 'number']
    });
}
exports.validateInput = validateInput;
;
function getCriteriaDefaults(passedCriteria) {
    const criteria = passedCriteria || {};
    if (typeof criteria.empty !== 'boolean') {
        criteria.empty = false;
    }
    if (criteria.mode !== undefined) {
        criteria.mode = mode_1.normalizeFileMode(criteria.mode);
    }
    return criteria;
}
;
function generatePathOccupiedByNotDirectoryError(path) {
    return new Error('Path ' + path + ' exists but is not a directory.' +
        ' Halting jetpack.dir() call for safety reasons.');
}
;
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
function checkWhatAlreadyOccupiesPathSync(path) {
    let stat;
    try {
        stat = fs_1.statSync(path);
    }
    catch (err) {
        // Detection if path already exists
        if (err.code !== 'ENOENT') {
            throw err;
        }
    }
    if (stat && !stat.isDirectory()) {
        throw generatePathOccupiedByNotDirectoryError(path);
    }
    return stat;
}
;
function createBrandNewDirectorySync(path, criteria) {
    mkdirp_1.sync(path, { mode: criteria.mode, fs: null });
}
;
function checkExistingDirectoryFulfillsCriteriaSync(path, stat, criteria) {
    const checkMode = function () {
        const mode = mode_1.normalizeFileMode(stat.mode);
        if (criteria.mode !== undefined && criteria.mode !== mode) {
            fs_1.chmodSync(path, criteria.mode);
        }
    };
    const checkEmptiness = function () {
        let list;
        if (criteria.empty) {
            // Delete everything inside this directory
            list = fs_1.readdirSync(path);
            list.forEach(function (filename) {
                rimraf.sync(pathUtil.resolve(path, filename));
            });
        }
    };
    checkMode();
    checkEmptiness();
}
;
function sync(path, passedCriteria) {
    var criteria = getCriteriaDefaults(passedCriteria);
    var stat = checkWhatAlreadyOccupiesPathSync(path);
    if (stat) {
        checkExistingDirectoryFulfillsCriteriaSync(path, stat, criteria);
    }
    else {
        createBrandNewDirectorySync(path, criteria);
    }
}
exports.sync = sync;
;
// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
const promisedStat = Q.denodeify(fs_1.stat);
const promisedChmod = Q.denodeify(fs_1.chmod);
const promisedReaddir = Q.denodeify(fs_1.readdir);
const promisedRimraf = Q.denodeify(rimraf);
const promisedMkdirp = Q.denodeify(mkdirp_1.sync);
function checkWhatAlreadyOccupiesPathAsync(path) {
    var deferred = Q.defer();
    promisedStat(path)
        .then(function (stat) {
        if (stat.isDirectory()) {
            deferred.resolve(stat);
        }
        else {
            deferred.reject(generatePathOccupiedByNotDirectoryError(path));
        }
    })
        .catch(function (err) {
        if (err.code === 'ENOENT') {
            // Path doesn't exist
            deferred.resolve(undefined);
        }
        else {
            // This is other error that nonexistent path, so end here.
            deferred.reject(err);
        }
    });
    return deferred.promise;
}
;
// Delete all files and directores inside given directory
function emptyAsync(path) {
    return new Promise((resolve, reject) => {
        promisedReaddir(path)
            .then(function (list) {
            const doOne = function (index) {
                let subPath;
                if (index === list.length) {
                    resolve();
                }
                else {
                    subPath = pathUtil.resolve(path, list[index]);
                    promisedRimraf(subPath).then(function () {
                        doOne(index + 1);
                    });
                }
            };
            doOne(0);
        })
            .catch(reject);
    });
}
;
function checkExistingDirectoryFulfillsCriteriaAsync(path, stat, criteria) {
    return new Promise((resolve, reject) => {
        const checkMode = function () {
            const mode = mode_1.normalizeFileMode(stat.mode);
            if (criteria.mode !== undefined && criteria.mode !== mode) {
                return promisedChmod(path, criteria.mode);
            }
            return new Q();
        };
        const checkEmptiness = function () {
            if (criteria.empty) {
                return emptyAsync(path);
            }
            return new Q();
        };
        checkMode()
            .then(checkEmptiness)
            .then(resolve, reject);
    });
}
;
function createBrandNewDirectoryAsync(path, criteria) {
    return promisedMkdirp(path, { mode: criteria.mode });
}
;
function async(path, passedCriteria) {
    return new Promise((resolve, reject) => {
        const criteria = getCriteriaDefaults(passedCriteria);
        checkWhatAlreadyOccupiesPathAsync(path)
            .then(stat => {
            if (stat !== undefined) {
                return checkExistingDirectoryFulfillsCriteriaAsync(path, stat, criteria);
            }
            return createBrandNewDirectoryAsync(path, criteria);
        })
            .then(resolve, reject);
    });
}
exports.async = async;
;
// ---------------------------------------------------------
// API
// ---------------------------------------------------------
module.exports.validateInput = validateInput;
//# sourceMappingURL=dir.js.map
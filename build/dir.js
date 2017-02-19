"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const pathUtil = require("path");
const fs_1 = require("fs");
const rimraf = require("rimraf");
const mode_1 = require("./utils/mode");
const validate_1 = require("./utils/validate");
const Q = require("q");
const mkdirp = require('mkdirp');
exports.validateInput = function (methodName, path, criteria) {
    let methodSignature = methodName + '(path, [criteria])';
    validate_1.validateArgument(methodSignature, 'path', path, ['string']);
    validate_1.validateOptions(methodSignature, 'criteria', criteria, {
        empty: ['boolean'],
        mode: ['string', 'number']
    });
};
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
    mkdirp.sync(path, { mode: criteria.mode });
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
    let criteria = getCriteriaDefaults(passedCriteria);
    let stat = checkWhatAlreadyOccupiesPathSync(path);
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
const promisedMkdirp = Q.denodeify(mkdirp);
function checkWhatAlreadyOccupiesPathAsync(path) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            promisedStat(path)
                .then(function (stat) {
                if (stat.isDirectory()) {
                    resolve(stat);
                }
                else {
                    reject(generatePathOccupiedByNotDirectoryError(path));
                }
            })
                .catch(function (err) {
                if (err.code === 'ENOENT') {
                    // Path doesn't exist
                    resolve(undefined);
                }
                else {
                    // This is other error that nonexistent path, so end here.
                    reject(err);
                }
            });
        });
    });
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
const checkMode = function (criteria, stat, path) {
    const mode = mode_1.normalizeFileMode(stat.mode);
    if (criteria.mode !== undefined && criteria.mode !== mode) {
        return promisedChmod(path, criteria.mode);
    }
    return Promise.resolve(null);
};
function checkExistingDirectoryFulfillsCriteriaAsync(path, stat, criteria) {
    return new Promise((resolve, reject) => {
        const checkEmptiness = function () {
            if (criteria.empty) {
                return emptyAsync(path);
            }
            return Promise.resolve();
        };
        checkMode(criteria, stat, path)
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
    const criteria = getCriteriaDefaults(passedCriteria);
    return new Promise((resolve, reject) => {
        checkWhatAlreadyOccupiesPathAsync(path)
            .then(function (stat) {
            if (stat !== undefined) {
                return checkExistingDirectoryFulfillsCriteriaAsync(path, stat, criteria);
            }
            return createBrandNewDirectoryAsync(path, criteria);
        })
            .then(resolve, reject);
    });
}
exports.async = async;
//# sourceMappingURL=dir.js.map
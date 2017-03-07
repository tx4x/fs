"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const pathUtil = require("path");
const fs_1 = require("fs");
const rimraf = require("rimraf");
const mode_1 = require("./utils/mode");
const validate_1 = require("./utils/validate");
const errors_1 = require("./errors");
const interfaces_1 = require("./interfaces");
const Q = require('q');
const mkdirp = require('mkdirp');
exports.validateInput = function (methodName, path, criteria) {
    let methodSignature = methodName + '(path, [criteria])';
    validate_1.validateArgument(methodSignature, 'path', path, ['string']);
    validate_1.validateOptions(methodSignature, 'criteria', criteria, {
        empty: ['boolean'],
        mode: ['string', 'number']
    });
};
const defaults = (options) => {
    const result = options || {};
    if (typeof result.empty !== 'boolean') {
        result.empty = false;
    }
    if (result.mode !== undefined) {
        result.mode = mode_1.normalizeFileMode(result.mode);
    }
    return result;
};
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
const dirStatsSync = (path) => {
    let stat;
    try {
        stat = fs_1.statSync(path);
    }
    catch (err) {
        // Detection if path already exists
        if (err.code !== interfaces_1.EError.NOEXISTS) {
            throw err;
        }
    }
    if (stat && !stat.isDirectory()) {
        throw errors_1.ErrNoDirectory(path);
    }
    return stat;
};
function mkdirSync(path, criteria) {
    mkdirp.sync(path, { mode: criteria.mode });
}
;
function checkDirSync(path, stat, options) {
    const checkMode = function () {
        const mode = mode_1.normalizeFileMode(stat.mode);
        if (options.mode !== undefined && options.mode !== mode) {
            fs_1.chmodSync(path, options.mode);
        }
    };
    const checkEmptiness = function () {
        let list;
        if (options.empty) {
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
function sync(path, options) {
    let criteria = defaults(options);
    let stat = dirStatsSync(path);
    if (stat) {
        checkDirSync(path, stat, criteria);
    }
    else {
        mkdirSync(path, criteria);
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
function dirStatAsync(path) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            promisedStat(path)
                .then(function (stat) {
                if (stat.isDirectory()) {
                    resolve(stat);
                }
                else {
                    reject(errors_1.ErrNoDirectory(path));
                }
            })
                .catch((err) => (err.code === interfaces_1.EError.NOEXISTS ? resolve(undefined) : reject(err)));
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
const checkDirAsync = (path, stat, options) => {
    return new Promise((resolve, reject) => {
        const checkEmptiness = function () {
            if (options.empty) {
                return emptyAsync(path);
            }
            return Promise.resolve();
        };
        checkMode(options, stat, path)
            .then(checkEmptiness)
            .then(resolve, reject);
    });
};
const mkdirAsync = (path, criteria) => {
    return promisedMkdirp(path, { mode: criteria.mode });
};
function async(path, passedCriteria) {
    const criteria = defaults(passedCriteria);
    return new Promise((resolve, reject) => {
        dirStatAsync(path)
            .then((stat) => {
            if (stat !== undefined) {
                return checkDirAsync(path, stat, criteria);
            }
            return mkdirAsync(path, criteria);
        })
            .then(resolve, reject);
    });
}
exports.async = async;
//# sourceMappingURL=dir.js.map
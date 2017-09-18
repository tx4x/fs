"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pathUtil = require("path");
const fs_1 = require("fs");
const util_1 = require("util");
const fs = require("fs");
const remove_1 = require("./remove");
const mode_1 = require("./utils/mode");
const validate_1 = require("./utils/validate");
const errors_1 = require("./errors");
const interfaces_1 = require("./interfaces");
const mkdirp = require("mkdirp");
exports.validateInput = (methodName, path, options) => {
    const methodSignature = methodName + '(path, [criteria])';
    validate_1.validateArgument(methodSignature, 'path', path, ['string']);
    validate_1.validateOptions(methodSignature, 'criteria', options, {
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
    mkdirp.sync(path, { mode: criteria.mode, fs: null });
}
;
function checkDirSync(path, stat, options) {
    const checkMode = function () {
        if (options.mode !== undefined) {
            fs.chmodSync(path, options.mode);
        }
    };
    const checkEmptiness = function () {
        let list;
        if (options.empty) {
            // Delete everything inside this directory
            list = fs_1.readdirSync(path);
            list.forEach(function (filename) {
                remove_1.sync(pathUtil.resolve(path, filename));
            });
        }
    };
    checkMode();
    checkEmptiness();
}
;
exports.sync = (path, options) => {
    const criteria = defaults(options);
    const stat = dirStatsSync(path);
    if (stat) {
        checkDirSync(path, stat, criteria);
    }
    else {
        mkdirSync(path, criteria);
    }
};
// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
const promisedStat = util_1.promisify(fs_1.stat);
const promisedReaddir = util_1.promisify(fs_1.readdir);
const dirStatAsync = (path) => {
    return new Promise((resolve, reject) => {
        promisedStat(path)
            .then((stat) => {
            if (stat.isDirectory()) {
                resolve(stat);
            }
            else {
                reject(errors_1.ErrNoDirectory(path));
            }
        })
            .catch((err) => (err.code === interfaces_1.EError.NOEXISTS ? resolve(undefined) : reject(err)));
    });
};
// Delete all files and directores inside given directory
const emptyAsync = (path) => {
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
                    remove_1.async(subPath).then(() => doOne(index + 1));
                }
            };
            doOne(0);
        })
            .catch(reject);
    });
};
const checkMode = function (criteria, stat, path) {
    if (criteria.mode !== undefined) {
        return util_1.promisify(fs.chmod)(path, criteria.mode);
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
    const options = criteria || {};
    return new Promise((resolve, reject) => {
        util_1.promisify(fs.mkdir)(path, options.mode)
            .then(resolve)
            .catch((err) => {
            if (err.code === 'ENOENT') {
                // Parent directory doesn't exist. Need to create it first.
                mkdirAsync(pathUtil.dirname(path), options)
                    .then(() => {
                    // Now retry creating this directory.
                    return util_1.promisify(fs.mkdir)(path, options.mode);
                })
                    .then(resolve)
                    .catch((err2) => {
                    if (err2.code === 'EEXIST') {
                        // Hmm, something other have already created the directory?
                        // No problem for us.
                        resolve();
                    }
                    else {
                        reject(err2);
                    }
                });
            }
            else if (err.code === 'EEXIST') {
                // The path already exists. We're fine.
                resolve();
            }
            else {
                reject(err);
            }
        });
    });
};
exports.async = (path, passedCriteria) => {
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
};
//# sourceMappingURL=dir.js.map
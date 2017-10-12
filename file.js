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
const fs = require("fs");
const Q = require('q');
const mode_1 = require("./utils/mode");
const validate_1 = require("./utils/validate");
const write_1 = require("./write");
const errors_1 = require("./errors");
const interfaces_1 = require("./interfaces");
const promisedStat = Q.denodeify(fs.stat);
const promisedChmod = Q.denodeify(fs.chmod);
function validateInput(methodName, path, options) {
    const methodSignature = methodName + '(path, [criteria])';
    validate_1.validateArgument(methodSignature, 'path', path, ['string']);
    validate_1.validateOptions(methodSignature, 'criteria', options, {
        content: ['string', 'buffer', 'object', 'array'],
        jsonIndent: ['number'],
        mode: ['string', 'number']
    });
}
exports.validateInput = validateInput;
;
function defaults(passedCriteria) {
    const criteria = passedCriteria || {};
    if (criteria.mode !== undefined) {
        criteria.mode = mode_1.normalizeFileMode(criteria.mode);
    }
    return criteria;
}
exports.defaults = defaults;
;
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
const isFile = (path) => {
    let stat;
    try {
        stat = fs.statSync(path);
    }
    catch (err) {
        // Detection if path exists
        if (err.code !== interfaces_1.EError.NOEXISTS) {
            throw err;
        }
    }
    if (stat && !stat.isFile()) {
        throw errors_1.ErrNotFile(path);
    }
    return stat;
};
const checkContent = function (path, mode, options) {
    if (options.content !== undefined) {
        write_1.sync(path, options.content, {
            mode: mode,
            jsonIndent: options.jsonIndent
        });
        return true;
    }
    return false;
};
const checkMode = function (path, mode, options) {
    if (options.mode !== undefined && options.mode !== mode) {
        fs.chmodSync(path, options.mode);
    }
};
const accept = (path, stat, options) => {
    const mode = mode_1.normalizeFileMode(stat.mode);
    if (!checkContent(path, mode, options)) {
        checkMode(path, mode, options);
    }
};
const touch = (path, options) => {
    const content = options.content !== undefined ? options.content : '';
    write_1.sync(path, content, {
        mode: options.mode,
        jsonIndent: options.jsonIndent
    });
};
function sync(path, options) {
    options = defaults(options);
    const stat = isFile(path);
    if (stat !== undefined) {
        accept(path, stat, options);
    }
    else {
        touch(path, options);
    }
}
exports.sync = sync;
;
// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
function isFileAsync(path) {
    return new Promise((resolve, reject) => {
        promisedStat(path)
            .then((stat) => {
            if ((stat).isFile()) {
                resolve(stat);
            }
            else {
                reject(errors_1.ErrNotFile(path));
            }
        })
            .catch((err) => (err.code === interfaces_1.EError.NOEXISTS ? resolve(undefined) : reject(err)));
    });
}
;
const checkModeAsync = (path, mode, options) => {
    if (options.mode !== undefined && options.mode !== mode) {
        return promisedChmod(path, options.mode);
    }
    return undefined;
};
const checkContentAsync = (path, mode, options) => {
    return new Promise((resolve, reject) => {
        if (options.content !== undefined) {
            write_1.async(path, options.content, {
                mode: mode,
                jsonIndent: options.jsonIndent
            }).then(() => resolve(true))
                .catch(reject);
        }
        else {
            resolve(false);
        }
    });
};
function writeAsync(path, stat, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const mode = mode_1.normalizeFileMode(stat.mode);
        return checkContentAsync(path, mode, options)
            .then(contentReplaced => {
            if (!contentReplaced) {
                return checkModeAsync(path, mode, options);
            }
            return undefined;
        });
    });
}
;
const touchAsync = (path, options) => {
    return write_1.async(path, options.content !== undefined ? options.content : '', {
        mode: options.mode,
        jsonIndent: options.jsonIndent
    });
};
function async(path, options) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            options = defaults(options);
            isFileAsync(path)
                .then((stat) => {
                if (stat !== undefined) {
                    return writeAsync(path, stat, options);
                }
                return touchAsync(path, options);
            })
                .then(resolve, reject);
        });
    });
}
exports.async = async;
;
//# sourceMappingURL=file.js.map
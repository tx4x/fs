"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pathUtil = require("path");
const tree_walker_1 = require("./utils/tree_walker");
const inspect_1 = require("./inspect");
const matcher_1 = require("./utils/matcher");
const validate_1 = require("./utils/validate");
const interfaces_1 = require("./interfaces");
const errors_1 = require("./errors");
function validateInput(methodName, path, options) {
    const methodSignature = methodName + '([path], options)';
    validate_1.validateArgument(methodSignature, 'path', path, ['string']);
    validate_1.validateOptions(methodSignature, 'options', options, {
        matching: ['string', 'array of string'],
        files: ['boolean'],
        directories: ['boolean'],
        recursive: ['boolean']
    });
}
exports.validateInput = validateInput;
const defaults = (options) => {
    const opts = options || {};
    // defaults:
    if (opts.files === undefined) {
        opts.files = true;
    }
    if (opts.directories === undefined) {
        opts.directories = false;
    }
    if (opts.recursive === undefined) {
        opts.recursive = true;
    }
    return opts;
};
const processFoundObjects = (foundObjects, cwd) => {
    return foundObjects.map((inspectObj) => {
        return pathUtil.relative(cwd, inspectObj.absolutePath);
    });
};
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
function findSync(path, options) {
    const foundInspectObjects = [];
    const matchesAnyOfGlobs = matcher_1.create(path, options.matching);
    tree_walker_1.sync(path, {
        maxLevelsDeep: options.recursive ? Infinity : 1,
        inspectOptions: {
            absolutePath: true
        }
    }, (itemPath, item) => {
        if (itemPath !== path && matchesAnyOfGlobs(itemPath)) {
            if ((item.type === interfaces_1.ENodeType.FILE && options.files === true)
                || (item.type === interfaces_1.ENodeType.DIR && options.directories === true)) {
                foundInspectObjects.push(item);
            }
        }
    });
    return processFoundObjects(foundInspectObjects, options.cwd);
}
function sync(path, options) {
    const entryPointInspect = inspect_1.sync(path);
    if (entryPointInspect === undefined) {
        throw errors_1.ErrDoesntExists(path);
    }
    else if (entryPointInspect.type !== 'dir') {
        throw errors_1.ErrIsNotDirectory(path);
    }
    return findSync(path, defaults(options));
}
exports.sync = sync;
// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
function findAsync(path, options) {
    return new Promise((resolve, reject) => {
        const foundInspectObjects = [];
        const matchesAnyOfGlobs = matcher_1.create(path, options.matching);
        const walker = tree_walker_1.stream(path, {
            maxLevelsDeep: options.recursive ? Infinity : 1,
            inspectOptions: {
                absolutePath: true
            }
        }).on('readable', () => {
            const data = walker.read();
            let item;
            if (data && data.path !== path && matchesAnyOfGlobs(data.path)) {
                item = data.item;
                if ((item.type === interfaces_1.ENodeType.FILE && options.files === true)
                    || (item.type === interfaces_1.ENodeType.DIR && options.directories === true)) {
                    foundInspectObjects.push(item);
                }
            }
        }).on('error', reject)
            .on('end', () => {
            resolve(processFoundObjects(foundInspectObjects, options.cwd));
        });
    });
}
function async(path, options) {
    return inspect_1.async(path)
        .then(entryPointInspect => {
        if (entryPointInspect === undefined) {
            throw errors_1.ErrDoesntExists(path);
        }
        else if (entryPointInspect.type !== interfaces_1.ENodeType.DIR) {
            throw errors_1.ErrIsNotDirectory(path);
        }
        return findAsync(path, defaults(options));
    });
}
exports.async = async;
//# sourceMappingURL=find.js.map
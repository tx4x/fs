"use strict";
const crypto_1 = require("crypto");
const pathUtil = require("path");
const Q = require("q");
const inspect_1 = require("./inspect");
const list_1 = require("./list");
const validate_1 = require("./utils/validate");
function validateInput(methodName, path, options) {
    const methodSignature = methodName + '(path, options)';
    validate_1.validateArgument(methodSignature, 'path', path, ['string']);
    validate_1.validateOptions(methodSignature, 'options', options, {
        checksum: ['string'],
        relativePath: ['boolean']
    });
    if (options && options.checksum !== undefined
        && inspect_1.supportedChecksumAlgorithms.indexOf(options.checksum) === -1) {
        throw new Error('Argument "options.checksum" passed to ' + methodSignature
            + ' must have one of values: ' + inspect_1.supportedChecksumAlgorithms.join(', '));
    }
}
exports.validateInput = validateInput;
;
function generateTreeNodeRelativePath(parent, path) {
    if (!parent) {
        return '.';
    }
    return parent.relativePath + '/' + pathUtil.basename(path);
}
;
// Creates checksum of a directory by using
// checksums and names of all its children inside.
function checksumOfDir(inspectList, algo) {
    const hash = crypto_1.createHash(algo);
    inspectList.forEach(function (inspectObj) {
        hash.update(inspectObj.name + inspectObj[algo]);
    });
    return hash.digest('hex');
}
;
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
function inspectTreeNodeSync(path, options, parent) {
    const treeBranch = inspect_1.sync(path, { checksum: options.checksum, symlinks: options.symlinks });
    if (treeBranch) {
        if (options.relativePath) {
            treeBranch.relativePath = generateTreeNodeRelativePath(parent, path);
        }
        if (treeBranch.type === 'dir' || (options.symlinks && treeBranch.type === 'symlink')) {
            treeBranch.size = 0;
            treeBranch.children = (list_1.sync(path) || []).map(function (filename) {
                let subBranchPath = pathUtil.join(path, filename);
                let treeSubBranch = inspectTreeNodeSync(subBranchPath, options, treeBranch);
                // Add together all childrens' size to get directory combined size.
                treeBranch.size += treeSubBranch.size || 0;
                return treeSubBranch;
            });
            if (options.checksum) {
                treeBranch[options.checksum] = checksumOfDir(treeBranch.children, options.checksum);
            }
        }
    }
    return treeBranch;
}
;
function sync(path, options) {
    options = options || {};
    options.symlinks = true;
    return inspectTreeNodeSync(path, options, undefined);
}
exports.sync = sync;
;
// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
function inspectTreeNodeAsync(path, options, parent) {
    return new Promise((resolve, reject) => {
        function inspectAllChildren(treeBranch) {
            let subDirDeferred = Q.defer();
            list_1.async(path).then(function (children) {
                let doNext = function (index) {
                    let subPath;
                    if (index === children.length) {
                        if (options.checksum) {
                            // We are done, but still have to calculate checksum of whole directory.
                            treeBranch[options.checksum] = checksumOfDir(treeBranch.children, options.checksum);
                        }
                        subDirDeferred.resolve();
                    }
                    else {
                        subPath = pathUtil.join(path, children[index]);
                        inspectTreeNodeAsync(subPath, options, treeBranch)
                            .then(treeSubBranch => {
                            children[index] = treeSubBranch;
                            treeBranch.size += treeSubBranch.size || 0;
                            doNext(index + 1);
                        })
                            .catch(subDirDeferred.reject);
                    }
                };
                treeBranch.children = children;
                treeBranch.size = 0;
                doNext(0);
            });
            return subDirDeferred.promise;
        }
        ;
        inspect_1.async(path, options)
            .then(treeBranch => {
            if (!treeBranch) {
                // Given path doesn't exist. We are done.
                resolve(treeBranch);
            }
            else {
                if (options.relativePath) {
                    treeBranch.relativePath = generateTreeNodeRelativePath(parent, path);
                }
                if (treeBranch.type !== 'dir') {
                    resolve(treeBranch);
                }
                else {
                    inspectAllChildren(treeBranch)
                        .then(() => {
                        resolve(treeBranch);
                    })
                        .catch(reject);
                }
            }
        })
            .catch(reject);
    });
}
;
function async(path, options) {
    options = options || {};
    options.symlinks = true;
    return inspectTreeNodeAsync(path, options);
}
exports.async = async;
;
//# sourceMappingURL=inspect_tree.js.map
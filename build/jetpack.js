"use strict";
const util = require("util");
const pathUtil = require("path");
const Q = require("q");
const append = require("./append");
const dir = require("./dir");
const file = require("./file");
const find = require("./find");
const inspect = require("./inspect");
const inspectTree = require("./inspect_tree");
const copy = require("./copy");
const exists = require("./exists");
const list = require("./list");
const move = require("./move");
const remove = require("./remove");
const rename = require("./rename");
const symlink = require("./symlink");
const streams = require("./streams");
const write = require("./write");
const read = require("./read");
// The Jetpack Context object.
// It provides the public API, and resolves all paths regarding to
// passed cwdPath, or default process.cwd() if cwdPath was not specified.
function jetpackContext(cwdPath) {
    let getCwdPath = function () {
        return cwdPath || process.cwd();
    };
    let cwd = function (w) {
        let args;
        let pathParts;
        // return current CWD if no arguments specified...
        if (arguments.length === 0) {
            return getCwdPath();
        }
        // ...create new CWD context otherwise
        args = Array.prototype.slice.call(arguments);
        pathParts = [getCwdPath()].concat(args);
        const res = jetpackContext(pathUtil.resolve.apply(null, pathParts));
        return res;
    };
    // resolves path to inner CWD path of this jetpack instance
    let resolvePath = function (path) {
        return pathUtil.resolve(getCwdPath(), path);
    };
    let getPath = function () {
        // add CWD base path as first element of arguments array
        Array.prototype.unshift.call(arguments, getCwdPath());
        return pathUtil.resolve.apply(null, arguments);
    };
    let normalizeOptions = function (options) {
        let opts = options || { cwd: getCwdPath() };
        return opts;
    };
    // API
    let api = {
        cwd: cwd,
        path: getPath,
        append: function (path, data, options) {
            append.validateInput('append', path, data, options);
            append.sync(resolvePath(path), data, options);
        },
        appendAsync: function (path, data, options) {
            append.validateInput('appendAsync', path, data, options);
            return append.async(resolvePath(path), data, options);
        },
        copy: function (from, to, options) {
            copy.validateInput('copy', from, to, options);
            copy.sync(resolvePath(from), resolvePath(to), options);
        },
        copyAsync: function (from, to, options) {
            copy.validateInput('copyAsync', from, to, options);
            return copy.async(resolvePath(from), resolvePath(to), options);
        },
        createWriteStream: function (path, options) {
            return streams.createWriteStream(resolvePath(path), options);
        },
        createReadStream: function (path, options) {
            return streams.createReadStream(resolvePath(path), options);
        },
        dir: function (path, criteria) {
            let normalizedPath;
            dir.validateInput('dir', path, criteria);
            normalizedPath = resolvePath(path);
            dir.sync(normalizedPath, criteria);
            return cwd(normalizedPath);
        },
        dirAsync: function (path, criteria) {
            const deferred = Q.defer();
            let normalizedPath;
            dir.validateInput('dirAsync', path, criteria);
            normalizedPath = resolvePath(path);
            dir.async(normalizedPath, criteria)
                .then(function () {
                deferred.resolve(cwd(normalizedPath));
            }, deferred.reject);
            return deferred.promise;
        },
        exists: function (path) {
            exists.validateInput('exists', path);
            return exists.sync(resolvePath(path));
        },
        existsAsync: function (path) {
            exists.validateInput('existsAsync', path);
            return exists.async(resolvePath(path));
        },
        file: function (path, criteria) {
            file.validateInput('file', path, criteria);
            file.sync(resolvePath(path), criteria);
            return this;
        },
        fileAsync: function (path, criteria) {
            let deferred = Q.defer();
            let that = this;
            file.validateInput('fileAsync', path, criteria);
            file.async(resolvePath(path), criteria)
                .then(function () {
                deferred.resolve(that);
            }, deferred.reject);
            return deferred.promise;
        },
        find: function (startPath, options) {
            // startPath is optional parameter, if not specified move rest of params
            // to proper places and default startPath to CWD.
            if (typeof options === 'undefined' && typeof startPath === 'object') {
                options = startPath;
                startPath = '.';
            }
            find.validateInput('find', startPath, options);
            return find.sync(resolvePath(startPath), normalizeOptions(options));
        },
        findAsync: function (startPath, options) {
            // startPath is optional parameter, if not specified move rest of params
            // to proper places and default startPath to CWD.
            if (typeof options === 'undefined' && typeof startPath === 'object') {
                options = startPath;
                startPath = '.';
            }
            find.validateInput('findAsync', startPath, options);
            return find.async(resolvePath(startPath), normalizeOptions(options));
        },
        inspect: function (path, fieldsToInclude) {
            inspect.validateInput('inspect', path, fieldsToInclude);
            return inspect.sync(resolvePath(path), fieldsToInclude);
        },
        inspectAsync: function (path, fieldsToInclude) {
            inspect.validateInput('inspectAsync', path, fieldsToInclude);
            return inspect.async(resolvePath(path), fieldsToInclude);
        },
        inspectTree: function (path, options) {
            inspectTree.validateInput('inspectTree', path, options);
            return inspectTree.sync(resolvePath(path), options);
        },
        inspectTreeAsync: function (path, options) {
            inspectTree.validateInput('inspectTreeAsync', path, options);
            return inspectTree.async(resolvePath(path), options);
        },
        list: function (path) {
            list.validateInput('list', path);
            return list.sync(resolvePath(path || '.'));
        },
        listAsync: function (path) {
            list.validateInput('listAsync', path);
            return list.async(resolvePath(path || '.'));
        },
        move: function (from, to) {
            move.validateInput('move', from, to);
            move.sync(resolvePath(from), resolvePath(to));
        },
        moveAsync: function (from, to) {
            move.validateInput('moveAsync', from, to);
            return move.async(resolvePath(from), resolvePath(to));
        },
        read: function (path, returnAs) {
            read.validateInput('read', path, returnAs);
            return read.sync(resolvePath(path), returnAs);
        },
        readAsync: function (path, returnAs) {
            read.validateInput('readAsync', path, returnAs);
            return read.async(resolvePath(path), returnAs);
        },
        remove: function (path) {
            remove.validateInput('remove', path);
            // If path not specified defaults to CWD
            remove.sync(resolvePath(path || '.'));
        },
        removeAsync: function (path) {
            remove.validateInput('removeAsync', path);
            // If path not specified defaults to CWD
            return remove.async(resolvePath(path || '.'));
        },
        rename: function (path, newName) {
            rename.validateInput('rename', path, newName);
            rename.sync(resolvePath(path), newName);
        },
        renameAsync: function (path, newName) {
            rename.validateInput('renameAsync', path, newName);
            return rename.async(resolvePath(path), newName);
        },
        symlink: function (symlinkValue, path) {
            symlink.validateInput('symlink', symlinkValue, path);
            symlink.sync(symlinkValue, resolvePath(path));
        },
        symlinkAsync: function (symlinkValue, path) {
            symlink.validateInput('symlinkAsync', symlinkValue, path);
            return symlink.async(symlinkValue, resolvePath(path));
        },
        write: function (path, data, options) {
            write.validateInput('write', path, data, options);
            write.sync(resolvePath(path), data, options);
        },
        writeAsync: function (path, data, options) {
            write.validateInput('writeAsync', path, data, options);
            return write.async(resolvePath(path), data, options);
        }
    };
    if (util.inspect['custom'] !== undefined) {
        // Without this console.log(jetpack) throws obscure error. Details:
        // https://github.com/szwacz/fs-jetpack/issues/29
        // https://nodejs.org/api/util.html#util_custom_inspection_functions_on_objects
        api[util.inspect['custom']] = function () {
            return getCwdPath();
        };
    }
    return api;
}
;
module.exports = jetpackContext;
//# sourceMappingURL=jetpack.js.map
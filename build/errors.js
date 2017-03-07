"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const interfaces_1 = require("./interfaces");
const errno = require('errno');
Object.keys(errno.code).forEach(function (code) {
    const e = errno.code[code];
    exports[code] = function (path) {
        let err = new Error(code + ', ' + e.description + (path ? ' \'' + path + '\'' : ''));
        err.errno = e.errno;
        err.code = code;
        err.path = path;
        return err;
    };
});
function ErrDoesntExists(path) {
    const err = new Error("Path to copy doesn't exist " + path);
    err.code = 'ENOENT';
    return err;
}
exports.ErrDoesntExists = ErrDoesntExists;
;
function ErrDestinationExists(path) {
    const err = new Error('Destination path already exists ' + path);
    err.code = 'EEXIST';
    return err;
}
exports.ErrDestinationExists = ErrDestinationExists;
;
function ErrIsNotDirectory(path) {
    const err = new interfaces_1.ErrnoException('Path you want to find stuff in must be a directory ' + path);
    err.code = 'ENOTDIR';
    return err;
}
exports.ErrIsNotDirectory = ErrIsNotDirectory;
;
//# sourceMappingURL=errors.js.map
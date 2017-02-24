"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const interfaces_1 = require("./interfaces");
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
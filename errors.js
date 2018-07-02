"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const interfaces_1 = require("./interfaces");
const errno = require('errno');
Object.keys(errno.code).forEach(function (code) {
    const e = errno.code[code];
    exports[code] = (path) => {
        const err = new Error(code + ', ' + e.description + (path ? ' \'' + path + '\'' : ''));
        err.errno = e.errno;
        err.code = code;
        err.path = path;
        return err;
    };
});
exports.ErrNoFileOrDir = (path) => {
    return new Error('Can\'t remove ' + path + ' The path is not file nor directory');
};
exports.ErrCantDelete = (path) => {
    return new Error('Can\'t remove ' + path);
};
exports.ErrNotFile = (path) => {
    return new Error('Path ' + path + ' exists but is not a file.' +
        ' Halting jetpack.file() call for safety reasons.');
};
exports.ErrNoDirectory = (path) => {
    return new Error('Path ' + path + ' exists but is not a directory.' +
        ' Halting jetpack.dir() call for safety reasons.');
};
exports.ErrDoesntExists = (path) => {
    const err = new Error('Path to copy doesn\'t exist ' + path);
    err.code = 'ENOENT';
    return err;
};
exports.ErrDestinationExists = (path) => {
    const err = new Error('Destination path already exists ' + path);
    err.code = 'EEXIST';
    return err;
};
exports.ErrIsNotDirectory = (path) => {
    const err = new interfaces_1.ErrnoException('Path you want to find stuff in must be a directory ' + path);
    err.code = 'ENOTDIR';
    return err;
};
//# sourceMappingURL=errors.js.map
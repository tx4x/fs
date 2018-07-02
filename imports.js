"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const writefs = require('write-file-atomic');
exports.file = {
    write_atomic: writefs
};
exports.json = {
    parse: JSON.parse,
    serialize: JSON.stringify
};
//# sourceMappingURL=imports.js.map
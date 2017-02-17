"use strict";
const pathUtil = require("path");
const move_1 = require("./move");
const validate_1 = require("./utils/validate");
function validateInput(methodName, path, newName) {
    const methodSignature = methodName + '(path, newName)';
    validate_1.argument(methodSignature, 'path', path, ['string']);
    validate_1.argument(methodSignature, 'newName', newName, ['string']);
}
exports.validateInput = validateInput;
;
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
function sync(path, newName) {
    const newPath = pathUtil.join(pathUtil.dirname(path), newName);
    move_1.sync(path, newPath);
}
exports.sync = sync;
;
// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
function async(path, newName) {
    const newPath = pathUtil.join(pathUtil.dirname(path), newName);
    return move_1.async(path, newPath);
}
exports.async = async;
;
//# sourceMappingURL=rename.js.map
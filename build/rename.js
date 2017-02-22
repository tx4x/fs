"use strict";
const pathUtil = require("path");
const move_1 = require("./move");
const validate_1 = require("./utils/validate");
function validateInput(methodName, path, newName) {
    const methodSignature = methodName + '(path, newName)';
    validate_1.validateArgument(methodSignature, 'path', path, ['string']);
    validate_1.validateArgument(methodSignature, 'newName', newName, ['string']);
}
exports.validateInput = validateInput;
;
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
function sync(path, newName) {
    move_1.sync(path, pathUtil.join(pathUtil.dirname(path), newName));
}
exports.sync = sync;
// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
function async(path, newName) {
    return move_1.async(path, pathUtil.join(pathUtil.dirname(path), newName));
}
exports.async = async;
//# sourceMappingURL=rename.js.map
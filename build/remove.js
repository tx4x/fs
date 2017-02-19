"use strict";
const rm = require("rimraf");
const denodeify = require("denodeify");
const validate_1 = require("./utils/validate");
function validateInput(methodName, path) {
    const methodSignature = methodName + '([path])';
    validate_1.validateArgument(methodSignature, 'path', path, ['string', 'undefined']);
}
exports.validateInput = validateInput;
;
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
function sync(path) {
    rm.sync(path);
}
exports.sync = sync;
;
// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
const qrm = denodeify(rm);
function async(path) {
    return qrm(path);
}
exports.async = async;
;
//# sourceMappingURL=remove.js.map
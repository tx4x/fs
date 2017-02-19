"use strict";
const rimraf = require("rimraf");
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
    rimraf.sync(path);
}
exports.sync = sync;
;
// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
const qRimraf = denodeify(rimraf);
function async(path) {
    return qRimraf(path);
}
exports.async = async;
;
//# sourceMappingURL=remove.js.map
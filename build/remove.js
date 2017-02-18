"use strict";
const Q = require("q");
const rimraf_1 = require("rimraf");
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
    rimraf_1.sync(path);
}
exports.sync = sync;
;
// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
const qRimraf = Q.denodeify(rimraf_1.sync);
function async(path) {
    return qRimraf(path);
}
exports.async = async;
;
//# sourceMappingURL=remove.js.map
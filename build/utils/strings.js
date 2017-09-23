"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canNormalize = typeof (''.normalize) === 'function';
const nonAsciiCharactersPattern = /[^\u0000-\u0080]/;
exports.normalizeNFC = (str) => {
    if (!exports.canNormalize || !str) {
        return str;
    }
    let res;
    if (nonAsciiCharactersPattern.test(str)) {
        res = str.normalize('NFC');
    }
    else {
        res = str;
    }
    return res;
};
//# sourceMappingURL=strings.js.map
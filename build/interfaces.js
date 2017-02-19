"use strict";
/////////////////////////////////////////////////////////
//
//  Enums
//
var EInspectItemType;
(function (EInspectItemType) {
    EInspectItemType[EInspectItemType["FILE"] = 'file'] = "FILE";
    EInspectItemType[EInspectItemType["DIR"] = 'dir'] = "DIR";
    EInspectItemType[EInspectItemType["SYMLINK"] = 'symlink'] = "SYMLINK";
    EInspectItemType[EInspectItemType["OTHER"] = 'other'] = "OTHER";
})(EInspectItemType = exports.EInspectItemType || (exports.EInspectItemType = {}));
var ECopyOverwriteMode;
(function (ECopyOverwriteMode) {
    ECopyOverwriteMode[ECopyOverwriteMode["SKIP"] = 0] = "SKIP";
    ECopyOverwriteMode[ECopyOverwriteMode["OVERWRITE"] = 1] = "OVERWRITE";
    ECopyOverwriteMode[ECopyOverwriteMode["IF_NEWER"] = 2] = "IF_NEWER";
    ECopyOverwriteMode[ECopyOverwriteMode["IF_SIZE_DIFFERS"] = 3] = "IF_SIZE_DIFFERS";
    ECopyOverwriteMode[ECopyOverwriteMode["APPEND"] = 4] = "APPEND";
})(ECopyOverwriteMode = exports.ECopyOverwriteMode || (exports.ECopyOverwriteMode = {}));
//# sourceMappingURL=interfaces.js.map
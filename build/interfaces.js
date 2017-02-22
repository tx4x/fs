"use strict";
/////////////////////////////////////////////////////////
//
//  Enums
//
var ENodeType;
(function (ENodeType) {
    ENodeType[ENodeType["FILE"] = 'file'] = "FILE";
    ENodeType[ENodeType["DIR"] = 'dir'] = "DIR";
    ENodeType[ENodeType["SYMLINK"] = 'symlink'] = "SYMLINK";
    ENodeType[ENodeType["OTHER"] = 'other'] = "OTHER";
})(ENodeType = exports.ENodeType || (exports.ENodeType = {}));
var EResolveMode;
(function (EResolveMode) {
    EResolveMode[EResolveMode["SKIP"] = 0] = "SKIP";
    EResolveMode[EResolveMode["OVERWRITE"] = 1] = "OVERWRITE";
    EResolveMode[EResolveMode["IF_NEWER"] = 2] = "IF_NEWER";
    EResolveMode[EResolveMode["IF_SIZE_DIFFERS"] = 3] = "IF_SIZE_DIFFERS";
    EResolveMode[EResolveMode["APPEND"] = 4] = "APPEND";
    EResolveMode[EResolveMode["THROW"] = 5] = "THROW";
    EResolveMode[EResolveMode["ABORT"] = 6] = "ABORT";
})(EResolveMode = exports.EResolveMode || (exports.EResolveMode = {}));
var EError;
(function (EError) {
    EError[EError["NONE"] = 'None'] = "NONE";
    EError[EError["EXISTS"] = 'EEXISTS'] = "EXISTS";
    EError[EError["PERMISSION"] = 'EEXISTS'] = "PERMISSION";
    EError[EError["NOEXISTS"] = 'EACCESS'] = "NOEXISTS";
})(EError = exports.EError || (exports.EError = {}));
var EResolve;
(function (EResolve) {
    EResolve[EResolve["ALWAYS"] = 0] = "ALWAYS";
    EResolve[EResolve["THIS"] = 1] = "THIS";
})(EResolve = exports.EResolve || (exports.EResolve = {}));
//# sourceMappingURL=interfaces.js.map
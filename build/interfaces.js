"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    ENodeType[ENodeType["BLOCK"] = 'block'] = "BLOCK";
})(ENodeType = exports.ENodeType || (exports.ENodeType = {}));
/**
 * Native errors.
 * @todo : replace with errno.
 */
exports.EError = {
    NONE: 'None',
    EXISTS: 'EEXIST',
    PERMISSION: 'EACCES',
    NOEXISTS: 'ENOENT',
    CROSS_DEVICE: 'EXDEV'
};
/**
 * An extented version of Error to make typescript happy. This has been copied from
 * the official Node typings.
 *
 * @export
 * @class ErrnoException
 * @extends {Error}
 */
class ErrnoException extends Error {
}
exports.ErrnoException = ErrnoException;
/**
 * The possible modes to resolve a conflict during copy and move.
 *
 * @export
 * @enum {number}
 */
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
/**
 * Additional flags for copy
 *
 * @export
 * @enum {number}
 */
var ECopyFlags;
(function (ECopyFlags) {
    /**
     * Transfer atime and mtime of source to target
     */
    ECopyFlags[ECopyFlags["PRESERVE_TIMES"] = 2] = "PRESERVE_TIMES";
    /**
     * Empty the target folder
     */
    ECopyFlags[ECopyFlags["EMPTY"] = 4] = "EMPTY";
    /**
     * When copying, don't copy symlinks but resolve them instead.
     */
    ECopyFlags[ECopyFlags["FOLLOW_SYMLINKS"] = 8] = "FOLLOW_SYMLINKS";
})(ECopyFlags = exports.ECopyFlags || (exports.ECopyFlags = {}));
/**
 * An enumeration to narrow a conflict resolve to a single item or for all following conflicts.
 *
 * @export
 * @enum {number}
 */
var EResolve;
(function (EResolve) {
    /**
     * Always will use the chose conflict settings for all following conflicts.
     */
    EResolve[EResolve["ALWAYS"] = 0] = "ALWAYS";
    /**
     * 'This' will use the conflict settings for a single conflict so the conflict callback will be triggered again for the next conflict.
     */
    EResolve[EResolve["THIS"] = 1] = "THIS";
})(EResolve = exports.EResolve || (exports.EResolve = {}));
//# sourceMappingURL=interfaces.js.map
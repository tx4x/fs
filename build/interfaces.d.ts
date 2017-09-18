/// <reference types="node" />
export declare enum ENodeType {
    FILE,
    DIR,
    SYMLINK,
    OTHER,
    BLOCK,
}
/**
 * Native errors.
 * @todo : replace with errno.
 */
export declare let EError: any;
export interface INode {
    name: string;
    type: ENodeType | string;
    size?: number;
    accessTime?: Date;
    modifyTime?: Date;
    changeTime?: Date;
    absolutePath?: string;
    mode?: number;
    pointsAt?: string;
    relativePath?: string;
    children?: INode[];
    total?: number;
    checksum?: string;
    mime?: string;
}
/**
 * The options for "inspect".
 *
 * @export
 * @interface IInspectOptions
 */
export interface IInspectOptions {
    checksum?: string;
    mode?: boolean;
    times?: boolean;
    absolutePath?: boolean;
    symlinks?: boolean;
    size?: boolean;
    mime?: boolean;
}
export interface INodeReport {
    node: IProcessingNode;
    error: string;
    resolved: IConflictSettings;
}
/**
 * The accepted types for write and read as union.
 */
export declare type ReadWriteDataType = string | Buffer | Object;
/**
 * An extented version of Error to make typescript happy. This has been copied from
 * the official Node typings.
 *
 * @export
 * @class ErrnoException
 * @extends {Error}
 */
export declare class ErrnoException extends Error {
    errno?: number;
    code?: string;
    path?: string;
    syscall?: string;
    stack?: string;
}
/**
 * Structure for file operations.
 */
export interface IProcessingNode {
    path: string;
    item: INode;
    status?: ENodeOperationStatus;
    dst?: string;
}
/**
 * Basic flags during a file operation.
 *
 * @export
 * @enum {number}
 */
export declare enum EBaseFlags {
    /**
     * When copying, don't copy symlinks but resolve them instead.
     */
    FOLLOW_SYMLINKS = 8,
}
/**
 * Flags to determine certain properties during inspection.
 *
 * @export
 * @enum {number}
 */
export declare enum EInspectFlags {
    MODE = 2,
    TIMES = 4,
    SYMLINKS = 8,
    FILE_SIZE = 16,
    DIRECTORY_SIZE = 32,
    CHECKSUM = 64,
    MIME = 128,
}
/**
 * Basic options for file operations: used by cp, mv, rename and rm.
 *
 * @export
 * @interface IBaseOptions
 */
export interface IBaseOptions {
    /**
     * Array of glob minimatch patterns
     *
     * @type {string[]}
     * @memberOf IBaseOptions
     */
    matching?: string[];
    /**
     * A function called to reject or accept nodes. This is used only when matching
     * has been left empty.
     * @memberOf IBaseOptions
     */
    filter?: (from: string) => boolean;
    /**
     * Flags to determine properties per node
     *
     * @type {EInspectFlags}
     * @memberOf IBaseOptions
     */
    flags?: EInspectFlags;
}
/**
 * Callback prototype signature when an item has been copied.
 * This is used to abort the copy process when returning false.
 *
 * @param {string} path The path of the item.
 * @param {number} current The current index of the item.
 * @param {number} total The total of all items.
 * @param {INode} [item] The node data for the item.
 * @returns {boolean}
 */
export declare type ItemProgressCallback = (path: string, current: number, total: number, item?: INode) => boolean;
/**
 * Callback prototype signature when an item conflict occurs.
 * It's async since the conflict might be resolved in an client application and hence
 * we have to wait til the user decided.
 *
 * This is not being called if:
 * - a previous callback returned with IConflictSettings#mode == ALWAYS
 * - the options object already contains pre-defined conflict settings.
 *
 * @param {string} path The path of the item.
 * @param {INode} item The node data.
 * @param {string} err The native error code of the conflict (EEXIST,...)
 * @returns {Promise<IConflictSettings>}
 */
export declare type ResolveConflictCallback = (path: string, item: INode, err: string) => Promise<IConflictSettings>;
/**
 * Callback prototype signature when a file with at least 5MB size is being copied.
 *
 * @param {string} path The path of the item.
 * @param {number} current The current copied bytes.
 * @param {number} total The total size in bytes.
 * @returns {Promise<IConflictSettings>}
 */
export declare type WriteProgressCallback = (path: string, current: number, total: number) => void;
/**
 * Status of a node operation.
 *
 * @export
 * @enum {number}
 */
export declare enum ENodeOperationStatus {
    COLLECTED = 0,
    CHECKED = 1,
    PROCESSING = 2,
    PROCESS = 3,
    ASKING = 4,
    ANSWERED = 5,
    DONE = 6,
}
/**
 * The possible modes to resolve a conflict during copy and move.
 *
 * @export
 * @enum {number}
 */
export declare enum EResolveMode {
    SKIP = 0,
    OVERWRITE = 1,
    IF_NEWER = 2,
    IF_SIZE_DIFFERS = 3,
    APPEND = 4,
    THROW = 5,
    RETRY = 6,
    ABORT = 7,
}
/**
 * Additional flags for copy
 *
 * @export
 * @enum {number}
 */
export declare enum ECopyFlags {
    /**
     * Transfer atime and mtime of source to target
     */
    PRESERVE_TIMES = 2,
    /**
     * Empty the target folder
     */
    EMPTY = 4,
    /**
     * When copying, don't copy symlinks but resolve them instead.
     */
    FOLLOW_SYMLINKS = 8,
    /**
     * Collect errors & success
     */
    REPORT = 16,
}
/**
 * Copy options
 *
 * @export
 * @interface ICopyOptions
 */
export interface ICopyOptions {
    /**
     * @type {boolean}
     * @deprecated Use conflict callback instead.
     * @memberOf ICopyOptions
     */
    overwrite?: boolean;
    /**
     * Array of glob minimatch patterns
     *
     * @type {string[]}
     * @memberOf ICopyOptions
     */
    matching?: string[];
    /**
     * A function called to reject or accept nodes to be copied. This is used only when matching
     * has been left empty.
     * @memberOf ICopyOptions
     */
    filter?: (from: string) => boolean;
    /**
     * A progress callback for any copied item. Only excecuted in async.
     */
    progress?: ItemProgressCallback;
    /**
     * A progress function called for async and larger files only.
     *
     * @type {WriteProgressCallback}
     * @memberOf ICopyOptions
     */
    writeProgress?: WriteProgressCallback;
    /**
     * A callback when a conflict or error occurs. This is being called only if the user
     * didn't provide conflictSettings.
     *
     * @type {ResolveConflictCallback}
     * @memberOf ICopyOptions
     */
    conflictCallback?: ResolveConflictCallback;
    /**
     * Ability to set conflict resolver settings in advance, so that no callback will be called.
     *
     * @type {IConflictSettings}
     * @memberOf ICopyOptions
     */
    conflictSettings?: IConflictSettings;
    /**
     * Throttel copy for larger files. This will be only used when writeProgress is set and the file is at least 5MB.
     *
     * @type {number}
     * @memberOf ICopyOptions
     */
    throttel?: number;
    /**
     * Print some debug messages.
     *
     * @type {boolean}
     * @memberOf ICopyOptions
     */
    debug?: boolean;
    /**
     * The copy flags.
     *
     * @type {ECopyFlags}
     * @memberOf ICopyOptions
     */
    flags?: ECopyFlags;
}
/**
 * An enumeration to narrow a conflict resolve to a single item or for all following conflicts.
 *
 * @export
 * @enum {number}
 */
export declare enum EResolve {
    /**
     * Always will use the chose conflict settings for all following conflicts.
     */
    ALWAYS = 0,
    /**
     * 'This' will use the conflict settings for a single conflict so the conflict callback will be triggered again for the next conflict.
     */
    THIS = 1,
}
/**
 * A composite conflict settings and it's scope. This is the result type
 * for the conflict callback.
 *
 * @export
 * @interface IConflictSettings
 */
export interface IConflictSettings {
    /**
     * How to resolve this conflict/error.
     *
     * @type {EResolveMode}
     * @memberOf IConflictSettings
     */
    overwrite: EResolveMode;
    /**
     * The scope of this conflict resolver: always or this.
     *
     * @type {EResolve}
     * @memberOf IConflictSettings
     */
    mode: EResolve;
    /**
     * Track the origin error type for this settings.
     *
     * @type {string}
     * @memberOf IConflictSettings
     */
    error?: string;
}
export declare type TCopyResult = void | INodeReport[];
/**
 * fs/write options.
 *
 * @export
 * @interface IWriteOptions
 */
export interface IWriteOptions {
    atomic?: boolean;
    jsonIndent?: number;
    mode?: string;
}
export declare type TDeleteResult = void | INodeReport[];
/**
 * Additional flags for delete
 *
 * @export
 * @enum {number}
 */
export declare enum EDeleteFlags {
    REPORT = 16,
}
/**
 * Delete options
 *
 * @export
 * @interface IDeleteOptions
 */
export interface IDeleteOptions {
    /**
     * Array of glob minimatch patterns
     *
     * @type {string[]}
     * @memberOf IDeleteOptions
     */
    matching?: string[];
    /**
     * A callback when a conflict or error occurs. This is being called only if the user
     * didn't provide conflictSettings.
     *
     * @type {ResolveConflictCallback}
     * @memberOf IDeleteOptions
     */
    conflictCallback?: ResolveConflictCallback;
    /**
     * Ability to set conflict resolver settings in advance, so that no callback will be called.
     *
     * @type {IConflictSettings}
     * @memberOf IDeleteOptions
     */
    conflictSettings?: IConflictSettings;
    /**
     *
     * A progress callback for any deleted item. Only excecuted in async.
     * @type {ItemProgressCallback}
     * @memberOf IDeleteOptions
     */
    progress?: ItemProgressCallback;
    /**
     * Print some messages.
     *
     * @type {boolean}
     * @memberOf IDeleteOptions
     */
    debug?: boolean;
    /**
     * A function called to reject or accept nodes to be copied. This is used only when matching
     * has been left empty.
     * @memberOf IDeleteOptions
     */
    filter?: (from: string) => boolean;
    /**
     * Move files to system's trash/recycle-bin
     *
     * @type {boolean}
     * @memberOf IDeleteOptions
     */
    trash?: boolean;
    flags?: EDeleteFlags;
}

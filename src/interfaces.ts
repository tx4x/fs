/////////////////////////////////////////////////////////
//
//  Enums
//
export enum ENodeType {
	FILE = <any>'file',
	DIR = <any>'dir',
	SYMLINK = <any>'symlink',
	OTHER = <any>'other',
	BLOCK = <any>'block'
}

/**
 * Native errors.
 * @todo : replace with errno.
 */
export let EError: any = {
	NONE: 'None',
	EXISTS: 'EEXIST',
	PERMISSION: 'EACCES',
	NOEXISTS: 'ENOENT',
	CROSS_DEVICE: 'EXDEV'
};

/////////////////////////////////////////////////////////
//
//  Data structures
//
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
}

/**
 * The accepted types for write and read as union.
 */
export type ReadWriteDataType = string | Buffer | Object;

/**
 * An extented version of Error to make typescript happy. This has been copied from
 * the official Node typings.
 *
 * @export
 * @class ErrnoException
 * @extends {Error}
 */
export class ErrnoException extends Error {
	errno?: number;
	code?: string;
	path?: string;
	syscall?: string;
	stack?: string;
}
/////////////////////////////////////////////////////////
//
//  File operations : copy
//
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
export type ItemProgressCallback = (path: string, current: number, total: number, item?: INode) => boolean;

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
export type ResolveConflictCallback = (path: string, item: INode, err: string) => Promise<IConflictSettings>;

/**
 * Callback prototype signature when a file with at least 5MB size is being copied.
 *
 * @param {string} path The path of the item.
 * @param {number} current The current copied bytes.
 * @param {number} total The total size in bytes.
 * @returns {Promise<IConflictSettings>}
 */
export type WriteProgressCallback = (path: string, current: number, total: number) => void;

export enum ENodeCopyStatus {
	COLLECTED,
	CHECKED,
	COPYING,
	PROCESSING,
	ASKING,
	ANSWERED,
	DONE
}
/**
 * The possible modes to resolve a conflict during copy and move.
 *
 * @export
 * @enum {number}
 */
export enum EResolveMode {
	SKIP = 0,
	OVERWRITE,
	IF_NEWER,
	IF_SIZE_DIFFERS,
	APPEND,
	THROW,
	ABORT
}

/**
 * Additional flags for copy
 *
 * @export
 * @enum {number}
 */
export enum ECopyFlags {
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
	FOLLOW_SYMLINKS = 8
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
	allowedToCopy?: (from: string) => boolean;
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
export enum EResolve {
	/**
	 * Always will use the chose conflict settings for all following conflicts.
	 */
	ALWAYS,
	/**
	 * 'This' will use the conflict settings for a single conflict so the conflict callback will be triggered again for the next conflict.
	 */
	THIS
}

/**
 * A composite conflict settings and it's scope. This is the result type
 * for the conflict callback.
 *
 * @export
 * @interface IConflictSettings
 */
export interface IConflictSettings {
	overwrite: EResolveMode;
	mode: EResolve;
}
/////////////////////////////////////////////////////////
//
//  File operations : write
//

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

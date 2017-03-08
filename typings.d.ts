declare module '@gbaumgart/fs/imports' {
	export const file: {
	    write_atomic: any;
	};
	export const json: {
	    parse: (text: string, reviver?: (key: any, value: any) => any) => any;
	    serialize: {
	        (value: any, replacer?: (key: string, value: any) => any, space?: string | number): string;
	        (value: any, replacer?: (string | number)[], space?: string | number): string;
	    };
	};

}
declare module '@gbaumgart/fs/interfaces' {
	/// <reference types="node" />
	export enum ENodeType {
	    FILE,
	    DIR,
	    SYMLINK,
	    OTHER,
	    BLOCK,
	}
	export let EError: any;
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
	export interface IInspectOptions {
	    checksum?: string;
	    mode?: boolean;
	    times?: boolean;
	    absolutePath?: boolean;
	    symlinks?: boolean;
	    size?: boolean;
	}
	export type ReadWriteDataType = string | Buffer | Object;
	export class ErrnoException extends Error {
	    errno?: number;
	    code?: string;
	    path?: string;
	    syscall?: string;
	    stack?: string;
	}
	export type ItemProgressCallback = (path: string, current: number, total: number, item?: INode) => boolean;
	export type ResolveConflictCallback = (path: string, item: INode, err: string) => Promise<IConflictSettings>;
	export type WriteProgressCallback = (path: string, current: number, total: number) => void;
	export enum EResolveMode {
	    SKIP = 0,
	    OVERWRITE = 1,
	    IF_NEWER = 2,
	    IF_SIZE_DIFFERS = 3,
	    APPEND = 4,
	    THROW = 5,
	    ABORT = 6,
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
	    FOLLOW_SYMLINKS = 8,
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
	     * Print console messages.
	     *
	     * @type {boolean}
	     * @memberOf ICopyOptions
	     */
	    debug?: boolean;
	    /**
	     * The copy flags
	     *
	     * @type {ECopyFlags}
	     * @memberOf ICopyOptions
	     */
	    flags?: ECopyFlags;
	}
	export enum EResolve {
	    ALWAYS = 0,
	    THIS = 1,
	}
	export interface IConflictSettings {
	    overwrite: EResolveMode;
	    mode: EResolve;
	}
	export interface IWriteOptions {
	    atomic?: boolean;
	    jsonIndent?: number;
	    mode?: string;
	}

}
declare module '@gbaumgart/fs/utils/validate' {
	export function validateArgument(methodName: string, argumentName: string, argumentValue: string | any, argumentMustBe: any): boolean;
	export function validateOptions(methodName: string, optionsObjName: string, obj: any, allowedOptions: any): void;

}
declare module '@gbaumgart/fs/write' {
	/// <reference types="node" />
	import { IWriteOptions } from '@gbaumgart/fs/interfaces';
	export type Data = string | Buffer | Object;
	import { ReadWriteDataType } from '@gbaumgart/fs/interfaces';
	export function validateInput(methodName: string, path: string, data: ReadWriteDataType, options: IWriteOptions): void;
	export function sync(path: string, data: Data, options?: IWriteOptions): void;
	export function async(path: string, data: Data, options?: IWriteOptions): Promise<null>;

}
declare module '@gbaumgart/fs/append' {
	/// <reference types="node" />
	export interface Options {
	    mode: string;
	    encoding?: string;
	    flag?: string;
	}
	export function validateInput(methodName: string, path: string, data: any, options?: Options): void;
	export function sync(path: string, data: any, options: Options): void;
	export function async(path: string, data: string | Buffer | Object, options?: Options): Promise<null>;

}
declare module '@gbaumgart/fs/utils/mode' {
	export function normalizeFileMode(mode: string | number): string;

}
declare module '@gbaumgart/fs/errors' {
	export function ErrNotFile(path: string): Error;
	export function ErrNoDirectory(path: string): Error;
	export function ErrDoesntExists(path: string): Error;
	export function ErrDestinationExists(path: string): Error;
	export function ErrIsNotDirectory(path: string): Error;

}
declare module '@gbaumgart/fs/dir' {
	export interface IOptions {
	    empty?: boolean;
	    mode?: number | string;
	}
	export const validateInput: (methodName: string, path: string, criteria?: IOptions) => void;
	export function sync(path: string, options?: IOptions): void;
	export function async(path: string, passedCriteria?: IOptions): Promise<{}>;

}
declare module '@gbaumgart/fs/file' {
	/// <reference types="node" />
	export interface IOptions {
	    content: string | Buffer | Object | Array<any>;
	    jsonIndent: number;
	    mode: string;
	}
	export function validateInput(methodName: string, path: string, options?: IOptions): void;
	export function defaults(passedCriteria: IOptions | null): IOptions;
	export function sync(path: string, options: IOptions): void;
	export function async(path: string, options: IOptions): Promise<{}>;

}
declare module '@gbaumgart/fs/inspect' {
	import { INode, IInspectOptions } from '@gbaumgart/fs/interfaces';
	export const supportedChecksumAlgorithms: string[];
	export function DefaultInspectOptions(): IInspectOptions;
	export function validateInput(methodName: string, path: string, options?: IInspectOptions): void;
	export function createItem(path: string, options?: IInspectOptions): INode;
	export function sync(path: string, options?: IInspectOptions): INode;
	export function async(path: string, options?: IInspectOptions): Promise<INode>;

}
declare module '@gbaumgart/fs/list' {
	export function validateInput(methodName: string, path: string): void;
	export function sync(path: string): string[];
	export function async(path: string): Promise<string[]>;

}
declare module '@gbaumgart/fs/utils/tree_walker' {
	/// <reference types="node" />
	import { Readable } from 'stream';
	import { IInspectOptions, INode } from '@gbaumgart/fs/interfaces';
	export interface IOptions {
	    inspectOptions: IInspectOptions;
	    maxLevelsDeep?: number;
	}
	export function sync(path: string, options: IOptions, callback: (path: string, item: INode) => void, currentLevel?: number): void;
	export function stream(path: string, options: IOptions): Readable;

}
declare module '@gbaumgart/fs/utils/matcher' {
	export function create(basePath: string, patterns: string[]): (absolutePath: string) => boolean;

}
declare module '@gbaumgart/fs/find' {
	export interface IOptions {
	    matching?: string[];
	    files?: boolean;
	    directories?: boolean;
	    recursive?: boolean;
	    cwd?: string;
	}
	export function validateInput(methodName: string, path: string, options?: IOptions): void;
	export function sync(path: string, options: IOptions): string[];
	export function async(path: string, options: IOptions): Promise<string[]>;

}
declare module '@gbaumgart/fs/inspect_tree' {
	import { INode } from '@gbaumgart/fs/interfaces';
	export interface Options {
	    checksum: string;
	    relativePath: boolean;
	    symlinks: boolean;
	}
	export function validateInput(methodName: string, path: string, options: Options): void;
	export function sync(path: string, options?: any): any | undefined;
	export function async(path: string, options?: Options): Promise<INode>;

}
declare module '@gbaumgart/fs/exists' {
	export function validateInput(methodName: string, path: string): void;
	export function sync(path: string): boolean | string;
	export function async(path: string): Promise<boolean | string>;

}
declare module '@gbaumgart/fs/remove' {
	export function validateInput(methodName: string, path: string): void;
	export function sync(path: string): void;
	export function async(path: string): Promise<null>;

}
declare module '@gbaumgart/fs/copy' {
	import { ICopyOptions, EResolveMode } from '@gbaumgart/fs/interfaces';
	export function validateInput(methodName: string, from: string, to: string, options?: ICopyOptions): void;
	export function sync(from: string, to: string, options?: ICopyOptions): void;
	export function copySymlinkAsync(from: string, to: string): any;
	export function resolveConflict(from: string, to: string, options: ICopyOptions, resolveMode: EResolveMode): boolean;
	/**
	 * Copy
	 * @export
	 * @param {string} from
	 * @param {string} to
	 * @param {ICopyOptions} [options]
	 * @returns
	 */
	export function async(from: string, to: string, options?: ICopyOptions): Promise<void>;

}
declare module '@gbaumgart/fs/move' {
	export function validateInput(methodName: string, from: string, to: string): void;
	export function sync(from: string, to: string): void;
	export function async(from: string, to: string): Promise<null>;

}
declare module '@gbaumgart/fs/rename' {
	export function validateInput(methodName: string, path: string, newName: string): void;
	export function sync(path: string, newName: string): void;
	export function async(path: string, newName: string): Promise<null>;

}
declare module '@gbaumgart/fs/symlink' {
	export function validateInput(methodName: string, symlinkValue: string, path: string): void;
	export function sync(symlinkValue: string, path: string): void;
	export function async(symlinkValue: string, path: string): Promise<{}>;

}
declare module '@gbaumgart/fs/streams' {
	export { createWriteStream } from 'fs';
	export { createReadStream } from 'fs';

}
declare module '@gbaumgart/fs/read' {
	import { ReadWriteDataType } from '@gbaumgart/fs/interfaces';
	export function validateInput(methodName: string, path: string, returnAs: string): void;
	export function sync(path: string, returnAs?: string): ReadWriteDataType;
	export function async(path: string, returnAs?: string): Promise<ReadWriteDataType>;

}
declare module '@gbaumgart/fs/playground' {
	export function testBig(): void;
	export function testManyWithProgress(): void;
	export function testCollisionDirectory(): void;
	export function testCollisionFile(): void;
	export function testCopySymlink(): void;
	export function prepareSymlink(): void;
	export function inspectTreeTest(): void;
	export function validateTest(): void;

}
declare module '@gbaumgart/fs/jetpack' {
	/// <reference types="node" />
	import { Options as AppendOptions } from '@gbaumgart/fs/append';
	import { IOptions as DirOptions } from '@gbaumgart/fs/dir';
	import { IOptions as FileOptions } from '@gbaumgart/fs/file';
	import { IOptions as FindOptions } from '@gbaumgart/fs/find';
	import { Options as InspectTreeOptions } from '@gbaumgart/fs/inspect_tree';
	import { IWriteOptions } from '@gbaumgart/fs/interfaces';
	import { ICopyOptions, INode, IInspectOptions } from '@gbaumgart/fs/interfaces';
	import { ReadWriteDataType } from '@gbaumgart/fs/interfaces';
	export interface IJetpack {
	    cwd(w?: any): IJetpack | string;
	    path(): string;
	    append(path: string, data: string | Buffer | Object, options?: AppendOptions): void;
	    appendAsync(path: string, data: string | Buffer | Object, options?: AppendOptions): Promise<null>;
	    copy(from: string, to: string, options?: ICopyOptions): void;
	    copyAsync(from: string, to: string, options?: ICopyOptions): Promise<void>;
	    createWriteStream(path: string, options?: {
	        flags?: string;
	        encoding?: string;
	        fd?: number;
	        mode?: number;
	        autoClose?: boolean;
	        start?: number;
	    }): any;
	    createReadStream(path: string, options?: {
	        flags?: string;
	        encoding?: string;
	        fd?: number;
	        mode?: number;
	        autoClose?: boolean;
	        start?: number;
	        end?: number;
	    }): any;
	    dir(path: string, criteria?: DirOptions): IJetpack;
	    dirAsync(path: string, criteria?: DirOptions): Promise<IJetpack>;
	    exists(path: string): boolean | string;
	    existsAsync(path: string): Promise<boolean | string>;
	    file(path: string, criteria?: FileOptions): void;
	    fileAsync(path: string, criteria?: FileOptions): Promise<null>;
	    find(startPath: string, options: FindOptions): string[];
	    findAsync(startPath: string, options: FindOptions): Promise<string[]>;
	    inspect(path: string, fieldsToInclude: IInspectOptions): INode;
	    inspectAsync(path: string, fieldsToInclude: IInspectOptions): Promise<INode>;
	    inspectTree(path: string, options?: InspectTreeOptions): INode;
	    inspectTreeAsync(path: string, options?: InspectTreeOptions): Promise<INode>;
	    list(path: string): string[];
	    listAsync(path: string): Promise<string[]>;
	    move(from: string, to: string): void;
	    moveAsync(from: string, to: string): Promise<null>;
	    read(path: string, returnAs?: string): ReadWriteDataType;
	    readAsync(path: string, returnAs?: string): Promise<ReadWriteDataType>;
	    remove(path: string): void;
	    removeAsync(path: string): Promise<null>;
	    rename(path: string, newName: string): void;
	    renameAsync(path: string, newName: string): Promise<null>;
	    symlink(symlinkValue: string, path: string): void;
	    symlinkAsync(symlinkValue: string, path: string): Promise<null>;
	    write(path: string, data: string | Buffer | Object, options?: IWriteOptions): void;
	    writeAsync(path: string, data: string | Buffer | Object, options?: IWriteOptions): Promise<null>;
	}
	export function jetpack(cwdPath?: string): IJetpack;

}
declare module '@gbaumgart/fs' {
	}

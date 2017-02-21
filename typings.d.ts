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
	export enum EInspectItemType {
	    FILE,
	    DIR,
	    SYMLINK,
	    OTHER,
	}
	export interface IInspectItem {
	    name: string;
	    type: EInspectItemType | string;
	    size?: number;
	    accessTime?: Date;
	    modifyTime?: Date;
	    changeTime?: Date;
	    absolutePath?: string;
	    mode?: number;
	    pointsAt?: string;
	    relativePath?: string;
	    children?: IInspectItem[];
	    total?: number;
	}
	export interface IInspectOptions {
	    checksum?: string;
	    mode?: boolean;
	    times?: boolean;
	    absolutePath?: boolean;
	    symlinks?: boolean;
	}
	export type ItemProgressCallback = (path: string, current: number, total: number, item?: IInspectItem) => void;
	export type WriteProgressCallback = (path: string, current: number, total: number) => void;
	export enum ECopyOverwriteMode {
	    SKIP = 0,
	    OVERWRITE = 1,
	    IF_NEWER = 2,
	    IF_SIZE_DIFFERS = 3,
	    APPEND = 4,
	}
	export interface ICopyOptions {
	    overwrite?: boolean;
	    matching?: string[];
	    progress?: ItemProgressCallback;
	    writeProgress?: WriteProgressCallback;
	    allowedToCopy?: (from: string) => boolean;
	}
	export interface IConflictResolver {
	    overwrite: ECopyOverwriteMode;
	}
	export interface WriteOptions {
	    atomic?: boolean;
	    jsonIndent?: number;
	    mode?: string;
	}

}
declare module '@gbaumgart/fs/utils/validate' {
	export function validateArgument(methodName: string, argumentName: string, argumentValue: string, argumentMustBe: any): boolean;
	export function validateOptions(methodName: any, optionsObjName: any, obj: any, allowedOptions: any): void;

}
declare module '@gbaumgart/fs/write' {
	/// <reference types="node" />
	import { WriteOptions } from '@gbaumgart/fs/interfaces';
	export type Data = string | Buffer | Object;
	export function validateInput(methodName: string, path: string, data: any, options: WriteOptions): void;
	export function sync(path: string, data: Data, options?: WriteOptions): void;
	export function async(path: string, data: Data, options?: WriteOptions): Promise<null>;

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
	export function normalizeFileMode(mode: any): string;

}
declare module '@gbaumgart/fs/dir' {
	export interface Options {
	    empty?: boolean;
	    mode?: number | string;
	}
	export const validateInput: (methodName: string, path: string, criteria?: Options) => void;
	export function sync(path: string, passedCriteria?: Options): void;
	export function async(path: string, passedCriteria?: Options): Promise<{}>;

}
declare module '@gbaumgart/fs/file' {
	/// <reference types="node" />
	export interface Options {
	    content: string | Buffer | Object | Array<any>;
	    jsonIndent: number;
	    mode: string;
	}
	export function validateInput(methodName: string, path: any, criteria?: Options): void;
	export function sync(path: string, options: Options): void;
	export function async(path: string, options: Options): Promise<{}>;

}
declare module '@gbaumgart/fs/inspect' {
	import { IInspectItem, IInspectOptions } from '@gbaumgart/fs/interfaces';
	export const supportedChecksumAlgorithms: string[];
	export function validateInput(methodName: string, path: string, options?: IInspectOptions): void;
	export function sync(path: string, options?: IInspectOptions): IInspectItem;
	export function async(path: string, options?: IInspectOptions): Promise<{}>;

}
declare module '@gbaumgart/fs/list' {
	export function validateInput(methodName: string, path: string): void;
	export function sync(path: string): string[];
	export function async(path: string): Promise<string[]>;

}
declare module '@gbaumgart/fs/utils/tree_walker' {
	/// <reference types="node" />
	import { Readable } from 'stream';
	import { IInspectOptions, IInspectItem } from '@gbaumgart/fs/interfaces';
	export interface Options {
	    inspectOptions: IInspectOptions;
	    maxLevelsDeep?: number;
	}
	export function sync(path: string, options: Options, callback: (path: string, item: IInspectItem) => void, currentLevel?: number): void;
	export function stream(path: string, options: any): Readable;

}
declare module '@gbaumgart/fs/utils/matcher' {
	export function create(basePath: any, patterns: any): (absolutePath: any) => boolean;

}
declare module '@gbaumgart/fs/find' {
	export interface Options {
	    matching?: string[];
	    files?: boolean;
	    directories?: boolean;
	    recursive?: boolean;
	    cwd?: string;
	}
	export function validateInput(methodName: string, path: string, _options?: Options): void;
	export function sync(path: string, options: Options): string[];
	export function async(path: string, options: Options): Promise<string[]>;

}
declare module '@gbaumgart/fs/inspect_tree' {
	import { IInspectItem } from '@gbaumgart/fs/interfaces';
	export interface Options {
	    checksum: string;
	    relativePath: boolean;
	    symlinks: boolean;
	}
	export function validateInput(methodName: string, path: string, options: Options): void;
	export function sync(path: string, options?: any): any | undefined;
	export function async(path: string, options?: Options): Promise<IInspectItem>;

}
declare module '@gbaumgart/fs/exists' {
	export function validateInput(methodName: string, path: string): void;
	export function sync(path: string): boolean | string;
	export function async(path: any): Promise<boolean | string>;

}
declare module '@gbaumgart/fs/copy' {
	import { ICopyOptions } from '@gbaumgart/fs/interfaces';
	export function validateInput(methodName: string, from: string, to: string, options?: ICopyOptions): void;
	export function sync(from: string, to: string, options?: ICopyOptions): void;
	export function async(from: string, to: string, options?: ICopyOptions): Promise<{}>;

}
declare module '@gbaumgart/fs/move' {
	export function validateInput(methodName: string, from: string, to: string): void;
	export function sync(from: any, to: any): void;
	export function async(from: string, to: string): Promise<null>;

}
declare module '@gbaumgart/fs/remove' {
	export function validateInput(methodName: string, path: string): void;
	export function sync(path: string): void;
	export function async(path: string): Promise<null>;

}
declare module '@gbaumgart/fs/rename' {
	export function validateInput(methodName: string, path: string, newName: string): void;
	export function sync(path: string, newName: string): void;
	export function async(path: any, newName: any): Promise<null>;

}
declare module '@gbaumgart/fs/symlink' {
	export function validateInput(methodName: any, symlinkValue: any, path: any): void;
	export function sync(symlinkValue: any, path: any): void;
	export function async(symlinkValue: any, path: any): Promise<{}>;

}
declare module '@gbaumgart/fs/streams' {
	export { createWriteStream } from 'fs';
	export { createReadStream } from 'fs';

}
declare module '@gbaumgart/fs/read' {
	/// <reference types="node" />
	export function validateInput(methodName: string, path: string, returnAs: string): void;
	export function sync(path: string, returnAs?: string): string | Buffer | Object;
	export function async(path: string, returnAs?: string): Promise<string | Buffer | Object>;

}
declare module '@gbaumgart/fs/jetpack' {
	/// <reference types="node" />
	import { Options as AppendOptions } from '@gbaumgart/fs/append';
	import { Options as DirOptions } from '@gbaumgart/fs/dir';
	import { Options as FileOptions } from '@gbaumgart/fs/file';
	import { Options as FindOptions } from '@gbaumgart/fs/find';
	import { Options as InspectTreeOptions } from '@gbaumgart/fs/inspect_tree';
	import { WriteOptions } from '@gbaumgart/fs/interfaces';
	import { ICopyOptions, IInspectOptions } from '@gbaumgart/fs/interfaces';
	export interface IJetpack {
	    cwd(w?: any): IJetpack | string;
	    path(): string;
	    append(path: string, data: string | Buffer | Object, options?: AppendOptions): void;
	    appendAsync(path: string, data: string | Buffer | Object, options?: AppendOptions): Promise<null>;
	    copy(from: string, to: string, options?: ICopyOptions): any;
	    copyAsync(from: string, to: string, options?: ICopyOptions): any;
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
	    file(path: string, criteria?: FileOptions): any;
	    fileAsync(path: string, criteria?: FileOptions): any;
	    find(startPath: string, options: FindOptions): string[];
	    findAsync(startPath: string, options: FindOptions): Promise<string[]>;
	    inspect(path: string, fieldsToInclude: IInspectOptions): any;
	    inspectAsync(path: string, fieldsToInclude: IInspectOptions): any;
	    inspectTree(path: string, options?: InspectTreeOptions): any;
	    inspectTreeAsync(path: string, options?: InspectTreeOptions): any;
	    list(path: string): string[];
	    listAsync(path: string): Promise<string[]>;
	    move(from: string, to: string): void;
	    moveAsync(from: string, to: string): Promise<null>;
	    read(path: string, returnAs?: string): any;
	    readAsync(path: string, returnAs?: string): Promise<string>;
	    remove(path: string): void;
	    removeAsync(path: string): Promise<null>;
	    rename(path: string, newName: string): void;
	    renameAsync(path: string, newName: string): Promise<null>;
	    symlink(symlinkValue: string, path: string): void;
	    symlinkAsync(symlinkValue: string, path: string): Promise<null>;
	    write(path: string, data: string | Buffer | Object, options?: WriteOptions): void;
	    writeAsync(path: string, data: string | Buffer | Object, options?: WriteOptions): any;
	}
	export function jetpack(cwdPath?: string): IJetpack;

}
declare module '@gbaumgart/fs' {
	}

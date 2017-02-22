/// <reference types="node" />
export declare enum ENodeType {
    FILE,
    DIR,
    SYMLINK,
    OTHER,
}
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
}
export declare type ReadWriteDataType = string | Buffer | Object;
export declare type ItemProgressCallback = (path: string, current: number, total: number, item?: INode) => void;
export declare type ResolveConflictCallback = (path: string, item: INode, err: EError) => Promise<IConflictSettings>;
export declare type WriteProgressCallback = (path: string, current: number, total: number) => void;
export declare enum EResolveMode {
    SKIP = 0,
    OVERWRITE = 1,
    IF_NEWER = 2,
    IF_SIZE_DIFFERS = 3,
    APPEND = 4,
    THROW = 5,
    ABORT = 6,
}
export declare enum EError {
    NONE,
    EXISTS,
    PERMISSION,
    NOEXISTS,
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
    matching?: string[];
    allowedToCopy?: (from: string) => boolean;
    progress?: ItemProgressCallback;
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
}
export declare enum EResolve {
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

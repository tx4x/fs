export declare enum EInspectItemType {
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
export declare type ItemProgressCallback = (path: string, current: number, total: number, item?: IInspectItem) => void;
export declare type WriteProgressCallback = (path: string, current: number, total: number) => void;
export declare enum ECopyOverwriteMode {
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

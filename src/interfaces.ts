/////////////////////////////////////////////////////////
//
//  Enums
//
export enum EInspectItemType {
    FILE = <any>'file',
    DIR = <any>'dir',
    SYMLINK = <any>'symlink',
    OTHER = <any>'other'
}
/////////////////////////////////////////////////////////
//
//  Data structures
//
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

/////////////////////////////////////////////////////////
//
//  File operations : copy
//
export type ItemProgressCallback = (path: string, current: number, total: number, item?: IInspectItem) => void;
export type WriteProgressCallback = (path: string, current: number, total: number) => void;
export enum ECopyOverwriteMode {
    SKIP = 0,
    OVERWRITE,
    IF_NEWER,
    IF_SIZE_DIFFERS,
    APPEND
}

//  copy options
export interface ICopyOptions {
    overwrite?: boolean;
    matching?: string[];
    progress?: ItemProgressCallback;
    writeProgress?: WriteProgressCallback;
    allowedToCopy?: (from: string) => boolean;
}
// conflict settings
export interface IConflictResolver {
    overwrite: ECopyOverwriteMode;
}
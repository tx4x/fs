/////////////////////////////////////////////////////////
//
//  Enums
//
export enum ENodeType {
  FILE = <any>'file',
  DIR = <any>'dir',
  SYMLINK = <any>'symlink',
  OTHER = <any>'other'
}

export let EError: any = {
  NONE: 'None',
  EXISTS: 'EEXIST',
  PERMISSION: 'EACCES',
  NOEXISTS: 'EACCES'
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

export interface IInspectOptions {
  checksum?: string;
  mode?: boolean;
  times?: boolean;
  absolutePath?: boolean;
  symlinks?: boolean;
}

export type ReadWriteDataType = string | Buffer | Object;

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
export type ItemProgressCallback = (path: string, current: number, total: number, item?: INode) => void;
export type ResolveConflictCallback = (path: string, item: INode, err: string) => Promise<IConflictSettings>;
export type WriteProgressCallback = (path: string, current: number, total: number) => void;
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
}
export enum EResolve {
  ALWAYS,
  THIS
}
// conflict settings
export interface IConflictSettings {
  overwrite: EResolveMode;
  mode: EResolve;
}
/////////////////////////////////////////////////////////
//
//  File operations : write
//
export interface IWriteOptions {
  atomic?: boolean;
  jsonIndent?: number;
  mode?: string;
}

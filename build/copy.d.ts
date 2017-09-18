import { ICopyOptions, EResolveMode, TCopyResult } from './interfaces';
export declare function validateInput(methodName: string, from: string, to: string, options?: ICopyOptions): void;
export declare function sync(from: string, to: string, options?: ICopyOptions): void;
export declare function copySymlinkAsync(from: string, to: string): Promise<{}>;
export declare function resolveConflict(from: string, to: string, options: ICopyOptions, resolveMode: EResolveMode): boolean;
/**
 * Final async copy function.
 * @export
 * @param {string} from
 * @param {string} to
 * @param {ICopyOptions} [options]
 * @returns
 */
export declare function async(from: string, to: string, options?: ICopyOptions): Promise<TCopyResult>;

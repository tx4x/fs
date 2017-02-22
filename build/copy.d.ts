import { ICopyOptions } from './interfaces';
export declare function validateInput(methodName: string, from: string, to: string, options?: ICopyOptions): void;
export declare function sync(from: string, to: string, options?: ICopyOptions): void;
/**
 * Copy
 *
 *
 * @export
 * @param {string} from
 * @param {string} to
 * @param {ICopyOptions} [options]
 * @returns
 */
export declare function async(from: string, to: string, options?: ICopyOptions): Promise<void>;

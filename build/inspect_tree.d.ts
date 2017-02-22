import { INode } from './interfaces';
export interface Options {
    checksum: string;
    relativePath: boolean;
    symlinks: boolean;
}
export declare function validateInput(methodName: string, path: string, options: Options): void;
export declare function sync(path: string, options?: any): any | undefined;
export declare function async(path: string, options?: Options): Promise<INode>;

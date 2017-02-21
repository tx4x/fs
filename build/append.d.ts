/// <reference types="node" />
export interface Options {
    mode: string;
    encoding?: string;
    flag?: string;
}
export declare function validateInput(methodName: string, path: string, data: any, options?: Options): void;
export declare function sync(path: string, data: any, options: Options): void;
export declare function async(path: string, data: string | Buffer | Object, options?: Options): Promise<null>;

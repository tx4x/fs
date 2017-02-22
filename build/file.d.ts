/// <reference types="node" />
export interface Options {
    content: string | Buffer | Object | Array<any>;
    jsonIndent: number;
    mode: string;
}
export declare function validateInput(methodName: string, path: string, criteria?: Options): void;
export declare function sync(path: string, options: Options): void;
export declare function async(path: string, options: Options): Promise<{}>;

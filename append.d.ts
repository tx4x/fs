/// <reference types="node" />
export interface Options {
    mode: string;
    encoding?: string;
    flag?: string;
}
export declare const validateInput: (methodName: string, path: string, data: any, options?: Options) => void;
export declare const sync: (path: string, data: any, options: Options) => void;
export declare const async: (path: string, data: string | Object | Buffer, options?: Options) => Promise<null>;

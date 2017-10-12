/// <reference types="node" />
export interface IOptions {
    content: string | Buffer | Object | Array<any>;
    jsonIndent: number;
    mode: string;
}
export declare function validateInput(methodName: string, path: string, options?: IOptions): void;
export declare function defaults(passedCriteria: IOptions | null): IOptions;
export declare function sync(path: string, options: IOptions): void;
export declare function async(path: string, options: IOptions): Promise<{}>;

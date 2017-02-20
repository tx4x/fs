export interface Options {
    matching?: string[];
    files?: boolean;
    directories?: boolean;
    recursive?: boolean;
    cwd?: string;
}
export declare function validateInput(methodName: string, path: string, _options?: Options): void;
export declare function sync(path: string, options: Options): string[];
export declare function async(path: string, options: Options): Promise<string[]>;

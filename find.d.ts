export interface IOptions {
    matching?: string[];
    files?: boolean;
    directories?: boolean;
    recursive?: boolean;
    cwd?: string;
}
export declare function validateInput(methodName: string, path: string, options?: IOptions): void;
export declare function sync(path: string, options: IOptions): string[];
export declare function async(path: string, options: IOptions): Promise<string[]>;

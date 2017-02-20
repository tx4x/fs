export declare function validateInput(methodName: string, path: string, returnAs: string): void;
export declare function sync(path: string, returnAs?: string): string | Buffer | Object;
export declare function async(path: string, returnAs?: string): Promise<string | Buffer | Object>;

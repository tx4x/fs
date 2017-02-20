export interface Options {
    empty?: boolean;
    mode?: number | string;
}
export declare const validateInput: (methodName: string, path: string, criteria?: Options) => void;
export declare function sync(path: string, passedCriteria?: Options): void;
export declare function async(path: string, passedCriteria?: Options): Promise<{}>;

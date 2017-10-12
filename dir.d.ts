export interface IOptions {
    empty?: boolean;
    mode?: number | string;
}
export declare const validateInput: (methodName: string, path: string, options?: IOptions) => void;
export declare const sync: (path: string, options?: IOptions) => void;
export declare const async: (path: string, passedCriteria?: IOptions) => Promise<{}>;

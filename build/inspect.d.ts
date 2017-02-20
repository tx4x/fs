import { IInspectItem, IInspectOptions } from './interfaces';
export declare const supportedChecksumAlgorithms: string[];
export declare function validateInput(methodName: string, path: string, options?: IInspectOptions): void;
export declare function sync(path: string, options?: IInspectOptions): IInspectItem;
export declare function async(path: string, options?: IInspectOptions): Promise<{}>;

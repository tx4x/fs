import { INode, IInspectOptions } from './interfaces';
export declare const supportedChecksumAlgorithms: string[];
export declare function DefaultInspectOptions(): IInspectOptions;
export declare function validateInput(methodName: string, path: string, options?: IInspectOptions): void;
export declare function createItem(path: string, options?: IInspectOptions): INode;
export declare function sync(path: string, options?: IInspectOptions): INode;
export declare function async(path: string, options?: IInspectOptions): Promise<INode>;

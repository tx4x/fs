import { ReadWriteDataType } from './interfaces';
export declare function validateInput(methodName: string, path: string, returnAs: string): void;
export declare function sync(path: string, returnAs?: string): ReadWriteDataType;
export declare function async(path: string, returnAs?: string): Promise<ReadWriteDataType>;

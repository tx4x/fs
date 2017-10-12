import { IWriteOptions, ReadWriteDataType } from './interfaces';
export declare function validateInput(methodName: string, path: string, data: ReadWriteDataType, options: IWriteOptions): void;
export declare function sync(path: string, data: ReadWriteDataType, options?: IWriteOptions): void;
export declare function async(path: string, data: ReadWriteDataType, options?: IWriteOptions): Promise<null>;

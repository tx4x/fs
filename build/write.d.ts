/// <reference types="node" />
import { IWriteOptions } from './interfaces';
export declare type Data = string | Buffer | Object;
import { ReadWriteDataType } from './interfaces';
export declare function validateInput(methodName: string, path: string, data: ReadWriteDataType, options: IWriteOptions): void;
export declare function sync(path: string, data: Data, options?: IWriteOptions): void;
export declare function async(path: string, data: Data, options?: IWriteOptions): Promise<null>;

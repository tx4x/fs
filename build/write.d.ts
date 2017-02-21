/// <reference types="node" />
import { WriteOptions } from './interfaces';
export declare type Data = string | Buffer | Object;
export declare function validateInput(methodName: string, path: string, data: any, options: WriteOptions): void;
export declare function sync(path: string, data: Data, options?: WriteOptions): void;
export declare function async(path: string, data: Data, options?: WriteOptions): Promise<null>;

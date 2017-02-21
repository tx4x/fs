/// <reference types="node" />
import { Readable } from 'stream';
import { IInspectOptions, IInspectItem } from '../interfaces';
export interface Options {
    inspectOptions: IInspectOptions;
    maxLevelsDeep?: number;
}
export declare function sync(path: string, options: Options, callback: (path: string, item: IInspectItem) => void, currentLevel?: number): void;
export declare function stream(path: string, options: any): Readable;

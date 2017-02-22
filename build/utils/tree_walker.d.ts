/// <reference types="node" />
import { Readable } from 'stream';
import { IInspectOptions, INode } from '../interfaces';
export interface Options {
    inspectOptions: IInspectOptions;
    maxLevelsDeep?: number;
}
export declare function sync(path: string, options: Options, callback: (path: string, item: INode) => void, currentLevel?: number): void;
export declare function stream(path: string, options: Options): Readable;

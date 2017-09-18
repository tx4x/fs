import { IProcessingNode, IBaseOptions } from './interfaces';
import { ArrayIterator } from '@xblox/core/iterator';
export declare function async(from: string, options: IBaseOptions): Promise<ArrayIterator<IProcessingNode>>;

import { sync as treeWalkerSync } from './utils/tree_walker';
import { INode, ENodeOperationStatus, IProcessingNode, IBaseOptions, EInspectFlags } from './interfaces';
import { create as matcher } from './utils/matcher';

import { ArrayIterator } from '@xblox/core/iterator';

export async function async(from: string, options: IBaseOptions): Promise<ArrayIterator<IProcessingNode>> {
	if (options && !options.filter) {
		if (options.matching) {
			options.filter = matcher(from, options.matching);
		} else {
			options.filter = () => { return true; };
		}
	}
	const collectorSync = function (path: string, item: INode) {
		if (!item) {
			return;
		}
		if (options.filter(path)) {
			nodes.push({
				path: path,
				item: item,
				status: ENodeOperationStatus.COLLECTED
			});
		}
	};
	let nodes: IProcessingNode[] = [];
	return new Promise<ArrayIterator<IProcessingNode>>((resolve, reject) => {
		treeWalkerSync(from, {
			inspectOptions: {
				mode: options ? options.flags & EInspectFlags.MODE ? true : false : false,
				times: options ? options.flags & EInspectFlags.TIMES ? true : false : false,
				checksum: options ? options.flags & EInspectFlags.CHECKSUM ? 'md5' : null : null,
				symlinks: options ? options.flags & EInspectFlags.SYMLINKS ? false : true : true,
				mime: options ? options.flags & EInspectFlags.MIME ? true : false : false
			}
		}, collectorSync);
		resolve(new ArrayIterator<IProcessingNode>(nodes));
	});
}

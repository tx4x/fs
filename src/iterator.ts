import { stream as treeWalkerStream } from './utils/tree_walker';

import { INode, ENodeOperationStatus, IProcessingNodes, IBaseOptions, EBaseFlags } from './interfaces';
import { create as matcher } from './utils/matcher';
interface IStreamResult {
	path: string;
	name: string;
	item: INode;
}
export async function async(from: string, options: IBaseOptions): Promise<IProcessingNodes[]> {
	if (options && !options.filter) {
		if (options.matching) {
			options.filter = matcher(from, options.matching);
		} else {
			options.filter = () => { return true; };
		}
	}
	const collector = function () {
		const stream: NodeJS.ReadableStream = this;
		const item: IStreamResult = <any> stream.read();
		if (!item) {
			return;
		}
		if (options.filter(item.path)) {
			nodes.push({
				path: item.path,
				item: item.item,
				status: ENodeOperationStatus.COLLECTED
			});
		}

	};
	let nodes: IProcessingNodes[] = [];
	return new Promise<IProcessingNodes[]>((resolve, reject) => {
		// start digging
		treeWalkerStream(from, {
			inspectOptions: {
				mode: true,
				times: true,
				checksum: 'md5',
				symlinks: options ? options.flags & EBaseFlags.FOLLOW_SYMLINKS ? false : true : true
			}
		}).on('readable', function () { return collector.apply(this, arguments); })
			.on('error', reject)
			.on('end', () => {
				resolve(nodes);
			});
	});
}

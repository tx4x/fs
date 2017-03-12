import { stream as treeWalkerStream } from './utils/tree_walker';
import { INode, ENodeOperationStatus, IProcessingNodes, IBaseOptions, EInspectFlags } from './interfaces';
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
		const item: IStreamResult = <any>stream.read();
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
		console.log('c',options.flags & EInspectFlags.CHECKSUM);
		// start digging
		treeWalkerStream(from, {
			inspectOptions: {
				mode: options ? options.flags & EInspectFlags.MODE ? true : false : false,
				times: options ? options.flags & EInspectFlags.TIMES ? true : false : false,
				checksum: options ? options.flags & EInspectFlags.CHECKSUM ? 'md5' : null : null,
				symlinks: options ? options.flags & EInspectFlags.SYMLINKS ? false : true : true,
				mime: options ? options.flags & EInspectFlags.MIME ? true : false : false
			}
		}).on('readable', function () { return collector.apply(this, arguments); })
			.on('error', reject)
			.on('end', () => {
				resolve(nodes);
			});
	});
}

import { Readable } from 'stream';
import * as  pathUtil from 'path';
import { sync as inspectSync, async as inspectASync } from '../inspect';
import { ENodeType, IInspectOptions, INode } from '../interfaces';
import { sync as listSync, async as listASync } from '../list';

export interface IOptions {
	inspectOptions: IInspectOptions;
	maxLevelsDeep?: number;
	user?: any;
}
// ---------------------------------------------------------
// SYNC
// ---------------------------------------------------------
export function sync(path: string, options: IOptions, callback: (path: string, item: INode) => void, currentLevel?: number): void {
	const item = inspectSync(path, options.inspectOptions);
	if (options.maxLevelsDeep === undefined) {
		options.maxLevelsDeep = Infinity;
	}
	if (currentLevel === undefined) {
		currentLevel = 0;
	}

	let children: string[] = [];
	const hasChildren: boolean = item && item.type === ENodeType.DIR && currentLevel < options.maxLevelsDeep;
	if (hasChildren) {
		children = listSync(path);
	};
	callback(path, item);
	if (hasChildren) {
		children.forEach(child => sync(path + pathUtil.sep + child, options, callback, currentLevel + 1));
	}
};

// ---------------------------------------------------------
// STREAM
// ---------------------------------------------------------
interface IPrivateNode {
	path: string;
	level: number;
	parent?: IPrivateNode;
	nextSibling?: IPrivateNode;
	inspected?: INode;
	item?: INode;
};
export function stream(path: string, options: IOptions) {
	const rs = new Readable({ objectMode: true });
	let nextTreeNode: IPrivateNode = {
		path: path,
		parent: undefined,
		level: 0
	};
	let running = false;
	let readSome: any;
	const error = (err: Error) => {
		rs.emit('error', err);
	};
	const findNextUnprocessedNode = (node: IPrivateNode): IPrivateNode => {
		if (node.nextSibling) {
			return node.nextSibling;
		} else if (node.parent) {
			return findNextUnprocessedNode(node.parent);
		}
		return undefined;
	};

	const pushAndContinueMaybe = (data: { path: string, item: INode }) => {
		const theyWantMore = rs.push(data);
		running = false;
		if (!nextTreeNode) {
			// Previous was the last node. The job is done.
			rs.push(null);
		} else if (theyWantMore) {
			readSome();
		}
	};

	if (options.maxLevelsDeep === undefined) {
		options.maxLevelsDeep = Infinity;
	}

	readSome = (): void => {
		const theNode: IPrivateNode = nextTreeNode;
		running = true;
		inspectASync(theNode.path, options.inspectOptions)
			.then((inspected: INode) => {
				theNode.inspected = inspected;
				if (inspected && inspected.type === ENodeType.DIR && theNode.level < options.maxLevelsDeep) {
					listASync(theNode.path)
						.then((childrenNames: string[]) => {
							const children = childrenNames.map((name) => {
								return {
									name: name,
									path: theNode.path + pathUtil.sep + name,
									parent: theNode,
									level: theNode.level + 1
								};
							});
							children.forEach((child: IPrivateNode, index: number) => {
								child.nextSibling = children[index + 1];
							});

							nextTreeNode = children[0] || findNextUnprocessedNode(theNode);
							pushAndContinueMaybe({ path: theNode.path, item: inspected });
						})
						.catch(error);
				} else {
					nextTreeNode = findNextUnprocessedNode(theNode);
					pushAndContinueMaybe({ path: theNode.path, item: inspected });
				}
			})
			.catch(error);
	};
	rs['_read'] = () => {
		if (!running) {
			readSome();
		}
	};
	return rs;
}

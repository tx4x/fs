import { Readable } from 'stream';
import * as  pathUtil from "path";
import { sync as inspectSync, async as inspectASync } from '../inspect';
import { EInspectItemType, IInspectOptions, IInspectItem } from '../interfaces';
import { sync as listSync, async as listASync } from '../list';


export interface Options {
  inspectOptions: IInspectOptions;
  maxLevelsDeep?: number;
}
// ---------------------------------------------------------
// SYNC
// ---------------------------------------------------------
export function sync(path: string, options: Options, callback: (path: string, item: IInspectItem) => void, currentLevel?: number) {
  const item = inspectSync(path, options.inspectOptions);
  if (options.maxLevelsDeep === undefined) {
    options.maxLevelsDeep = Infinity;
  }
  if (currentLevel === undefined) {
    currentLevel = 0;
  }

  let children: string[] = [];
  const hasChildren: boolean = item && item.type === EInspectItemType.DIR && currentLevel < options.maxLevelsDeep;
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

export function stream(path: string, options) {
  const rs = new Readable({ objectMode: true });
  let nextTreeNode = {
    path: path,
    parent: undefined,
    level: 0
  };
  let running: boolean = false;
  let readSome;
  const error = (err) => { rs.emit('error', err); };
  const findNextUnprocessedNode = (node) => {
    if (node.nextSibling) {
      return node.nextSibling;
    } else if (node.parent) {
      return findNextUnprocessedNode(node.parent);
    }
    return undefined;
  };

  const pushAndContinueMaybe = (data: { path: string, item: IInspectItem }) => {
    let theyWantMore = rs.push(data);
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

  readSome = () => {
    const theNode: any = nextTreeNode;
    running = true;
    inspectASync(theNode.path, options.inspectOptions)
      .then((inspected: IInspectItem) => {
        theNode.inspected = inspected;
        if (inspected &&
          (inspected).type === EInspectItemType.DIR &&
          theNode.level < options.maxLevelsDeep) {
          listASync(theNode.path)
            .then((childrenNames: string[]) => {
              const children = childrenNames.map(function (name) {
                return {
                  name: name,
                  path: theNode.path + pathUtil.sep + name,
                  parent: theNode,
                  level: theNode.level + 1
                };
              });
              children.forEach((child: any, index: number) => {
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
  rs['_read'] = function () {
    if (!running) {
      readSome();
    }
  };
  return rs;
}
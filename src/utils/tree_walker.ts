import { Readable } from 'stream';
import * as  pathUtil from "path";
import { sync as inspectSync, async as inspectASync } from '../inspect';
import { sync as listSync, async as listASync } from '../list';
// ---------------------------------------------------------
// SYNC
// ---------------------------------------------------------
export function sync(path, options, callback, currentLevel?: number) {
  const item = inspectSync(path, options.inspectOptions);
  if (options.maxLevelsDeep === undefined) {
    options.maxLevelsDeep = Infinity;
  }
  if (currentLevel === undefined) {
    currentLevel = 0;
  }

  callback(path, item);
  if (item && item.type === 'dir' && currentLevel < options.maxLevelsDeep) {
    listSync(path).forEach(function (child) {
      sync(path + pathUtil.sep + child, options, callback, currentLevel + 1);
    });
  }
};

// ---------------------------------------------------------
// STREAM
// ---------------------------------------------------------

export function stream(path, options) {
  const rs = new Readable({ objectMode: true });
  let nextTreeNode = {
    path: path,
    parent: undefined,
    level: 0
  };
  let running: boolean = false;
  let readSome;

  let error = function (err) {
    rs.emit('error', err);
  };

  let findNextUnprocessedNode = function (node) {
    if (node.nextSibling) {
      return node.nextSibling;
    } else if (node.parent) {
      return findNextUnprocessedNode(node.parent);
    }
    return undefined;
  };

  let pushAndContinueMaybe = function (data) {
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

  readSome = function () {
    let theNode: any = nextTreeNode;
    running = true;
    inspectASync(theNode.path, options.inspectOptions)
      .then(function (inspected) {
        theNode.inspected = inspected;
        if (inspected && (inspected as any).type === 'dir' && theNode.level < options.maxLevelsDeep) {
          listASync(theNode.path)
            .then(function (childrenNames: string[]) {
              let children = childrenNames.map(function (name) {
                return {
                  name: name,
                  path: theNode.path + pathUtil.sep + name,
                  parent: theNode,
                  level: theNode.level + 1
                };
              });
              children.forEach(function (child, index) {
                (child as any).nextSibling = children[index + 1];
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

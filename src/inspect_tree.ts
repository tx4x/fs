import { createHash } from 'crypto';
import * as  pathUtil from "path";
import * as Q from 'q';
import { sync as inspectSync, async as inspectASync, supportedChecksumAlgorithms } from './inspect';
import { EInspectItemType, IInspectItem, IInspectOptions } from './interfaces';
import { sync as listSync, async as listASync } from './list';
import { validateArgument, validateOptions } from './utils/validate';

export interface Options {
  checksum: string;
  relativePath: boolean;
  symlinks: boolean;
}
export function validateInput(methodName: string, path: string, options: Options): void {
  const methodSignature = methodName + '(path, options)';
  validateArgument(methodSignature, 'path', path, ['string']);
  validateOptions(methodSignature, 'options', options, {
    checksum: ['string'],
    relativePath: ['boolean']
  });

  if (options && options.checksum !== undefined
    && supportedChecksumAlgorithms.indexOf(options.checksum) === -1) {
    throw new Error('Argument "options.checksum" passed to ' + methodSignature
      + ' must have one of values: ' + supportedChecksumAlgorithms.join(', '));
  }
};

function generateTreeNodeRelativePath(parent: any, path: string): string {
  if (!parent) {
    return '.';
  }
  return parent.relativePath + '/' + pathUtil.basename(path);
};

// Creates checksum of a directory by using
// checksums and names of all its children inside.
function checksumOfDir(inspectList: any[], algo: string): string {
  const hash = createHash(algo);
  inspectList.forEach(function (inspectObj) {
    hash.update(inspectObj.name + inspectObj[algo]);
  });
  return hash.digest('hex');
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
function inspectTreeNodeSync(path: string, options: Options, parent: any): IInspectItem {
  const treeBranch = inspectSync(path, { checksum: options.checksum, symlinks: options.symlinks });
  if (treeBranch) {
    if (options.relativePath) {
      treeBranch.relativePath = generateTreeNodeRelativePath(parent, path);
    }
    if (treeBranch.type === EInspectItemType.DIR /*|| (options.symlinks && treeBranch.type === 'symlink')*/) {
      treeBranch.size = 0;
      treeBranch.children = (listSync(path) || []).map(function (filename) {
        let subBranchPath = pathUtil.join(path, filename);
        let treeSubBranch = inspectTreeNodeSync(subBranchPath, options, treeBranch);
        // Add together all childrens' size to get directory combined size.
        treeBranch.size += treeSubBranch.size || 0;
        //treeBranch.total += treeSubBranch.total;
        return treeSubBranch;
      });
      if (options.checksum) {
        treeBranch[options.checksum] = checksumOfDir(treeBranch.children, options.checksum);
      }
    }
  }
  return treeBranch;
};

export function sync(path: string, options?: any): any | undefined {
  options = options || {};
  options.symlinks = true;
  return inspectTreeNodeSync(path, options, undefined);
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
function inspectTreeNodeAsync(path: string, options: Options, parent?: any): Promise<IInspectItem> {
  return new Promise((resolve, reject) => {
    const inspectAllChildren = (treeBranch: IInspectItem) => {
      return new Promise((resolve, reject) => {
        listASync(path).then((children: any) => {          
          const doNext = (index: number) => {
            let subPath: string;
            if (index === children.length) {
              if (options.checksum) {
                // We are done, but still have to calculate checksum of whole directory.
                treeBranch[options.checksum] = checksumOfDir(treeBranch.children, options.checksum);
              }
              resolve();
            } else {
              subPath = pathUtil.join(path, children[index]);
              inspectTreeNodeAsync(subPath, options, treeBranch)
                .then((treeSubBranch: IInspectItem) => {
                  children[index] = treeSubBranch;
                  treeBranch.size += treeSubBranch.size || 0;
                  doNext(index + 1);
                })
                .catch(reject);
            }
          };
          treeBranch.children = children;
          treeBranch.size = 0;
          doNext(0);
        });
      });
    };

    inspectASync(path, options)
      .then((treeBranch: IInspectItem) => {
        if (!treeBranch) {
          // Given path doesn't exist. We are done.
          resolve(treeBranch);
        } else {
          if (options.relativePath) {
            treeBranch.relativePath = generateTreeNodeRelativePath(parent, path);
          }
          if (treeBranch.type !== EInspectItemType.DIR) {
            resolve(treeBranch);
          } else {
            inspectAllChildren(treeBranch)
              .then(() => resolve(treeBranch))
              .catch(reject);
          }
        }
      })
      .catch(reject);
  });
};

export function async(path: string, options?: Options): Promise<IInspectItem> {
  options = options || {} as Options;
  options.symlinks = true;
  return inspectTreeNodeAsync(path, options);
};
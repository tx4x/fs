import { createHash } from 'crypto';
import * as  pathUtil from "path";
import * as Q from 'q';
import { sync as inspectSync, async as inspectASync, supportedChecksumAlgorithms } from './inspect';
import { sync as listSync, async as listASync } from './list';
import { validateArgument, validateOptions } from './utils/validate';
export function validateInput(methodName: string, path: string, options: any): void {
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

function generateTreeNodeRelativePath(parent: any, path: string) {
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
function inspectTreeNodeSync(path: string, options: any, parent: any): any {
  const treeBranch = inspectSync(path, options);
  if (treeBranch) {
    if (options.relativePath) {
      treeBranch.relativePath = generateTreeNodeRelativePath(parent, path);
    }

    if (treeBranch.type === 'dir' || (options.symlinks && treeBranch.type === 'symlink')) {
      treeBranch.size = 0;
      treeBranch.children = (listSync(path) || []).map(function (filename) {
        var subBranchPath = pathUtil.join(path, filename);
        var treeSubBranch = inspectTreeNodeSync(subBranchPath, options, treeBranch);
        // Add together all childrens' size to get directory combined size.
        treeBranch.size += treeSubBranch.size || 0;
        return treeSubBranch;
      });

      if (options.checksum) {
        treeBranch[options.checksum] = checksumOfDir(treeBranch.children, options.checksum);
      }
    }
  }

  return treeBranch;
};

export function sync(path: string, options?: any) {
  options = options || {};
  options.symlinks = true;
  return inspectTreeNodeSync(path, options, undefined);
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

function inspectTreeNodeAsync(path: string, options, parent) {
  return new Promise((resolve, reject) => {
    function inspectAllChildren(treeBranch) {
      var subDirDeferred = Q.defer();
      listASync(path).then(function (children: any) {
        var doNext = function (index) {
          let subPath;
          if (index === children.length) {
            if (options.checksum) {
              // We are done, but still have to calculate checksum of whole directory.
              treeBranch[options.checksum] = checksumOfDir(treeBranch.children, options.checksum);
            }
            subDirDeferred.resolve();
          } else {
            subPath = pathUtil.join(path, children[index]);
            inspectTreeNodeAsync(subPath, options, treeBranch)
              .then(treeSubBranch => {
                children[index] = treeSubBranch;
                treeBranch.size += (treeSubBranch as any).size || 0;
                doNext(index + 1);
              })
              .catch(subDirDeferred.reject);
          }
        };

        treeBranch.children = children;
        treeBranch.size = 0;

        doNext(0);
      });

      return subDirDeferred.promise;
    };

    inspectASync(path, options)
      .then(treeBranch => {
        if (!treeBranch) {
          // Given path doesn't exist. We are done.
          resolve(treeBranch);
        } else {
          if (options.relativePath) {
            (treeBranch as any).relativePath = generateTreeNodeRelativePath(parent, path);
          }

          if ((treeBranch as any).type !== 'dir') {
            resolve(treeBranch);
          } else {
            inspectAllChildren(treeBranch)
              .then(() => {
                resolve(treeBranch);
              })
              .catch(reject);
          }
        }
      })
      .catch(reject);
  });
};

export function async(path, options) {
  options = options || {};
  options.symlinks = true;
  return inspectTreeNodeAsync(path, options, null);
};

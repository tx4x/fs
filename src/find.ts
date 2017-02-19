import * as  pathUtil from "path";
import { sync as treeWalkerSync, stream as treeWalkerStream } from './utils/tree_walker';
import { sync as inspectSync, async as inspectASync } from './inspect';
import { create as matcher } from './utils/matcher';
import { validateArgument, validateOptions } from './utils/validate';
export interface Options {
  matching?: string[];
  files?: boolean;
  directories?: boolean;
  recursive?: boolean;
  cwd?: string;
}
export function validateInput(methodName: string, path: string, _options?: Options): void {
  const methodSignature = methodName + '([path], options)';
  validateArgument(methodSignature, 'path', path, ['string']);
  validateOptions(methodSignature, 'options', _options, {
    matching: ['string', 'array of string'],
    files: ['boolean'],
    directories: ['boolean'],
    recursive: ['boolean']
  });
};

function normalizeOptions(options?: Options) {
  let opts = options || {};
  // defaults:
  if (opts.files === undefined) {
    opts.files = true;
  }
  if (opts.directories === undefined) {
    opts.directories = false;
  }
  if (opts.recursive === undefined) {
    opts.recursive = true;
  }
  return opts;
};

function processFoundObjects(foundObjects: any, cwd: string):string[] {
  return foundObjects.map(inspectObj => {
    return pathUtil.relative(cwd, inspectObj.absolutePath);
  });
};

function generatePathDoesntExistError(path: string):Error {
  const err = new Error("Path you want to find stuff in doesn't exist " + path);
  err['code'] = 'ENOENT';
  return err;
};

function generatePathNotDirectoryError(path: string):Error {
  const err = new Error('Path you want to find stuff in must be a directory ' + path);
  err['code'] = 'ENOTDIR';
  return err;
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
function findSync(path: string, options: Options): string[] {
  const foundInspectObjects = [];
  const matchesAnyOfGlobs = matcher(path, options.matching);
  treeWalkerSync(path, {
    maxLevelsDeep: options.recursive ? Infinity : 1,
    inspectOptions: {
      absolutePath: true
    }
  }, (itemPath, item) => {
    if (itemPath !== path && matchesAnyOfGlobs(itemPath)) {
      if ((item.type === 'file' && options.files === true)
        || (item.type === 'dir' && options.directories === true)) {
        foundInspectObjects.push(item);
      }
    }
  });
  return processFoundObjects(foundInspectObjects, options.cwd);
};

export function sync(path: string, options: Options): string[] {
  const entryPointInspect = inspectSync(path);
  if (entryPointInspect === undefined) {
    throw generatePathDoesntExistError(path);
  } else if (entryPointInspect.type !== 'dir') {
    throw generatePathNotDirectoryError(path);
  }
  return findSync(path, normalizeOptions(options));
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

function findAsync(path: string, options: Options): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    const foundInspectObjects = [];
    const matchesAnyOfGlobs = matcher(path, options.matching);
    const walker = treeWalkerStream(path, {
      maxLevelsDeep: options.recursive ? Infinity : 1,
      inspectOptions: {
        absolutePath: true
      }
    }).on('readable', () => {
      const data = walker.read();
      let item: any;
      if (data && data.path !== path && matchesAnyOfGlobs(data.path)) {
        item = data.item;
        if ((item.type === 'file' && options.files === true)
          || (item.type === 'dir' && options.directories === true)) {
          foundInspectObjects.push(item);
        }
      }
    }).on('error', reject)
      .on('end', () => {
        resolve(processFoundObjects(foundInspectObjects, options.cwd));
      });
  });
};

export function async(path: string, options: Options): Promise<string[]> {
  return inspectASync(path)
    .then(entryPointInspect => {
      if (entryPointInspect === undefined) {
        throw generatePathDoesntExistError(path);
      } else if ((entryPointInspect as any).type !== 'dir') {
        throw generatePathNotDirectoryError(path);
      }
      return findAsync(path, normalizeOptions(options));
    });
};

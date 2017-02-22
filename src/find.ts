import * as  pathUtil from "path";
import { sync as treeWalkerSync, stream as treeWalkerStream } from './utils/tree_walker';
import { sync as inspectSync, async as inspectASync } from './inspect';
import { create as matcher } from './utils/matcher';
import { validateArgument, validateOptions } from './utils/validate';
import { INode, ENodeType, ErrnoException } from './interfaces';
import { ErrDoesntExists, ErrIsNotDirectory } from './errors';

export interface Options {
  matching?: string[];
  files?: boolean;
  directories?: boolean;
  recursive?: boolean;
  cwd?: string;
}
export function validateInput(methodName: string, path: string, options?: Options): void {
  const methodSignature = methodName + '([path], options)';
  validateArgument(methodSignature, 'path', path, ['string']);
  validateOptions(methodSignature, 'options', options, {
    matching: ['string', 'array of string'],
    files: ['boolean'],
    directories: ['boolean'],
    recursive: ['boolean']
  });
};

const defaults = (options?: Options): Options =>{
  let opts = options || {} as Options;
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

const processFoundObjects = (foundObjects: any, cwd: string): string[] => {
  return foundObjects.map((inspectObj: INode) => {
    return pathUtil.relative(cwd, inspectObj.absolutePath);
  });
};


// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
function findSync(path: string, options: Options): string[] {
  const foundInspectObjects: INode[] = [];
  const matchesAnyOfGlobs = matcher(path, options.matching);
  treeWalkerSync(path, {
    maxLevelsDeep: options.recursive ? Infinity : 1,
    inspectOptions: {
      absolutePath: true
    }
  }, (itemPath, item) => {
    if (itemPath !== path && matchesAnyOfGlobs(itemPath)) {
      if ((item.type === ENodeType.FILE && options.files === true)
        || (item.type === ENodeType.DIR && options.directories === true)) {
        foundInspectObjects.push(item);
      }
    }
  });
  return processFoundObjects(foundInspectObjects, options.cwd);
};

export function sync(path: string, options: Options): string[] {
  const entryPointInspect = inspectSync(path);
  if (entryPointInspect === undefined) {
    throw ErrDoesntExists(path);
  } else if (entryPointInspect.type !== 'dir') {
    throw ErrIsNotDirectory(path);
  }
  return findSync(path, defaults(options));
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

function findAsync(path: string, options: Options): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    const foundInspectObjects: INode[] = [];
    const matchesAnyOfGlobs = matcher(path, options.matching);
    const walker = treeWalkerStream(path, {
      maxLevelsDeep: options.recursive ? Infinity : 1,
      inspectOptions: {
        absolutePath: true
      }
    }).on('readable', () => {
      const data = walker.read();
      let item: INode;
      if (data && data.path !== path && matchesAnyOfGlobs(data.path)) {
        item = data.item;
        if ((item.type === ENodeType.FILE && options.files === true)
          || (item.type === ENodeType.DIR && options.directories === true)) {
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
        throw ErrDoesntExists(path);
      } else if ((entryPointInspect as any).type !== ENodeType.DIR) {
        throw ErrIsNotDirectory(path);
      }
      return findAsync(path, defaults(options));
    });
};

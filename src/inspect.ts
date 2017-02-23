import { Stats, readlinkSync, statSync, lstatSync, stat, lstat, readlink, createReadStream, readFileSync } from 'fs';
import * as  pathUtil from "path";
import { validateArgument, validateOptions } from './utils/validate';
import { createHash } from 'crypto';
import { ENodeType, INode, IInspectOptions } from './interfaces';
const Q = require('q');
import * as denodeify from 'denodeify';
export const supportedChecksumAlgorithms: string[] = ['md5', 'sha1', 'sha256', 'sha512'];
const promisedStat = denodeify(stat);
const promisedLstat = denodeify(lstat);
const promisedReadlink = denodeify(readlink);
export function DefaultInspectOptions(): IInspectOptions {
  return {
    times: true,
    mode: true
  };
}
export function validateInput(methodName: string, path: string, options?: IInspectOptions): void {
  const methodSignature: string = methodName + '(path, [options])';
  validateArgument(methodSignature, 'path', path, ['string']);
  validateOptions(methodSignature, 'options', options, {
    checksum: ['string'],
    mode: ['boolean'],
    times: ['boolean'],
    absolutePath: ['boolean'],
    symlinks: ['boolean']
  });

  if (options && options.checksum !== undefined
    && supportedChecksumAlgorithms.indexOf(options.checksum) === -1) {
    throw new Error('Argument "options.checksum" passed to ' + methodSignature
      + ' must have one of values: ' + supportedChecksumAlgorithms.join(', '));
  }
};

const createInspectObj = (path: string, options: IInspectOptions, stat: Stats): INode => {
  let obj: INode = {} as INode;
  obj.name = pathUtil.basename(path);
  if (stat.isFile()) {
    obj.type = ENodeType.FILE;
    obj.size = stat.size;
  } else if (stat.isDirectory()) {
    obj.type = ENodeType.DIR;
  } else if (stat.isSymbolicLink()) {
    obj.type = ENodeType.SYMLINK;
  } else {
    obj.type = ENodeType.OTHER;
  }

  if (options.mode) {
    obj.mode = stat.mode;
  }

  if (options.times) {
    obj.accessTime = stat.atime;
    obj.modifyTime = stat.mtime;
    obj.changeTime = stat.ctime;
  }

  if (options.absolutePath) {
    obj.absolutePath = path;
  }
  return obj;
};
export function createItem(path: string, options?: IInspectOptions): INode {
  options = options || DefaultInspectOptions();
  const stat = (options.symlinks ? lstatSync : statSync)(path);
  return createInspectObj(path, options, stat);
};
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
const fileChecksum = (path: string, algo: string): string => {
  const hash = createHash(algo);
  const data = readFileSync(path);
  hash.update(data);
  return hash.digest('hex');
};

const addExtraFieldsSync = (path: string, inspectObj: any, options: IInspectOptions): INode => {
  if (inspectObj.type === ENodeType.FILE && options.checksum) {
    inspectObj[options.checksum] = fileChecksum(path, options.checksum);
    console.log('0000000000 ' + path + '   ' + options.checksum, inspectObj[options.checksum]);
  } else if (inspectObj.type === ENodeType.SYMLINK) {
    inspectObj.pointsAt = readlinkSync(path);
  }
  return inspectObj;
};

export function sync(path: string, options?: IInspectOptions): INode {
  let stat: Stats;
  let inspectObj: INode;
  options = options || {} as IInspectOptions;
  try {
    stat = (options.symlinks ? lstatSync : statSync)(path);
  } catch (err) {
    // Detection if path exists
    if (err.code === 'ENOENT') {
      // Doesn't exist. Return undefined instead of throwing.
      return undefined;
    }
    throw err;
  }
  return addExtraFieldsSync(path, createInspectObj(path, options, stat), options);
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
async function fileChecksumAsync(path: string, algo: string): Promise<string> {
  const deferred = Q.defer();
  const hash = createHash(algo);
  const s = createReadStream(path);
  s.on('data', (data: string | Buffer) => hash.update(data));
  s.on('end', () => deferred.resolve(hash.digest('hex')));
  s.on('error', (e: Error) => deferred.reject(e));
  return deferred.promise;
};

const addExtraFieldsAsync = (path: string, inspectObj: INode, options: IInspectOptions) => {
  if (inspectObj.type === ENodeType.FILE && options.checksum) {
    return fileChecksumAsync(path, options.checksum)
      .then(checksum => {
        (inspectObj as any)[options['checksum']] = checksum;
        return inspectObj;
      });
  } else if (inspectObj.type === ENodeType.SYMLINK) {
    return promisedReadlink(path)
      .then(linkPath => {
        inspectObj.pointsAt = linkPath;
        return inspectObj;
      });
  }
  return new Q(inspectObj);
};

export function async(path: string, options?: IInspectOptions): Promise<INode> {
  return new Promise((resolve, reject) => {
    options = options || {} as IInspectOptions;
    (options.symlinks ? promisedLstat : promisedStat)(path)
      .then((stat: Stats) => { addExtraFieldsAsync(path, createInspectObj(path, options, stat), options).then(resolve, reject); })
      .catch(err => (err.code === 'ENOENT' ? resolve(undefined) : reject(err)));
  });
}

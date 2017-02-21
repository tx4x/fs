import { Stats, readlinkSync, statSync, lstatSync, stat, lstat, readlink, createReadStream, readFileSync } from 'fs';
import * as  pathUtil from "path";
import { validateArgument, validateOptions } from './utils/validate';
import { createHash } from 'crypto';
import { EInspectItemType, IInspectItem, IInspectOptions } from './interfaces';
import * as Q from 'q';
import * as denodeify from 'denodeify';
export const supportedChecksumAlgorithms: string[] = ['md5', 'sha1', 'sha256', 'sha512'];
const promisedStat = denodeify(stat);
const promisedLstat = denodeify(lstat);
const promisedReadlink = denodeify(readlink);

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

const createInspectObj = (path: string, options: IInspectOptions, stat: Stats): IInspectItem => {
  let obj: IInspectItem = {} as IInspectItem;
  obj.name = pathUtil.basename(path);
  if (stat.isFile()) {
    obj.type = EInspectItemType.FILE;
    obj.size = stat.size;
  } else if (stat.isDirectory()) {
    obj.type = EInspectItemType.DIR;
  } else if (stat.isSymbolicLink()) {
    obj.type = EInspectItemType.SYMLINK;
  } else {
    obj.type = EInspectItemType.OTHER;
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
  //obj.total = 1;
  return obj;
};
export function createItem(path: string, options?: IInspectOptions):IInspectItem {
  options = options || {
    times:true,
    mode:true
  } as IInspectOptions;
  const stat = (options.symlinks ? lstatSync : statSync)(path);
  return createInspectObj(path, options, stat);
}
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
const fileChecksum = (path: string, algo: string): string => {
  const hash = createHash(algo);
  const data = readFileSync(path);
  hash.update(data);
  return hash.digest('hex');
};

const addExtraFieldsSync = (path: string, inspectObj: any, options: IInspectOptions): IInspectItem => {
  if (inspectObj.type === EInspectItemType.FILE && options.checksum) {
    inspectObj[options.checksum] = fileChecksum(path, options.checksum);
  } else if (inspectObj.type === EInspectItemType.SYMLINK) {
    inspectObj.pointsAt = readlinkSync(path);
  }
  return inspectObj;
};

export function sync(path: string, options?: IInspectOptions): IInspectItem {
  let stat: Stats;
  let inspectObj: IInspectItem;
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
  s.on('data', data => hash.update(data));
  s.on('end', () => deferred.resolve(hash.digest('hex')));
  s.on('error', e => deferred.reject(e));
  return deferred.promise;
};

const addExtraFieldsAsync = (path: string, inspectObj: IInspectItem, options: IInspectOptions) => {
  if (inspectObj.type === EInspectItemType.FILE && options.checksum) {
    return fileChecksumAsync(path, options.checksum)
      .then(checksum => {
        inspectObj[options.checksum] = checksum;
        return inspectObj;
      });
  } else if (inspectObj.type === EInspectItemType.SYMLINK) {
    return promisedReadlink(path)
      .then(linkPath => {
        inspectObj.pointsAt = linkPath;
        return inspectObj;
      });
  }
  return new Q(inspectObj);
};

export function async(path: string, options?: IInspectOptions) {
  return new Promise((resolve, reject) => {
    options = options || {} as IInspectOptions;
    (options.symlinks ? promisedLstat : promisedStat)(path)
      .then((stat: Stats) => { addExtraFieldsAsync(path, createInspectObj(path, options, stat), options).then(resolve, reject); })
      .catch(err => (err.code === 'ENOENT' ? resolve(undefined) : reject(err)));
  });
}

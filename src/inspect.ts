import { Stats, readlinkSync, statSync, lstatSync, stat, lstat, readlink, createReadStream, readFileSync } from 'fs';
import * as  pathUtil from "path";
import { validateArgument, validateOptions } from './utils/validate';
import { createHash } from 'crypto';
import { promisify } from './promisify';
import { EInspectItemType, IInspectItem, IInspectOptions } from './interfaces';
import * as Q from 'q';
export const supportedChecksumAlgorithms: string[] = ['md5', 'sha1', 'sha256', 'sha512'];

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

function createInspectObj(path: string, options: IInspectOptions, stat: Stats): IInspectItem {
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

  obj.total = 1;

  return obj;
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
function fileChecksum(path: string, algo: string) {
  const hash = createHash(algo);
  const data = readFileSync(path);
  hash.update(data);
  return hash.digest('hex');
};

function addExtraFieldsSync(path: string, inspectObj: any, options: IInspectOptions): void {
  if (inspectObj.type === 'file' && options.checksum) {
    inspectObj[options.checksum] = fileChecksum(path, options.checksum);
  } else if (inspectObj.type === 'symlink') {
    inspectObj.pointsAt = readlinkSync(path);
  }
};

export function sync(path: string, options?: IInspectOptions): IInspectItem {
  let statOperation = statSync;
  let stat: Stats;
  let inspectObj: IInspectItem;
  options = options || {} as IInspectOptions;
  if (options.symlinks) {
    statOperation = lstatSync;
  }

  try {
    stat = statOperation(path);
  } catch (err) {
    // Detection if path exists
    if (err.code === 'ENOENT') {
      // Doesn't exist. Return undefined instead of throwing.
      return undefined;
    }
    throw err;
  }
  inspectObj = createInspectObj(path, options, stat);
  addExtraFieldsSync(path, inspectObj, options);
  return inspectObj;
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
const promisedStat = promisify(stat);
const promisedLstat = promisify(lstat);
const promisedReadlink = promisify(readlink);

function fileChecksumAsync(path: string, algo: string) {
  //return new Promise((resolve, reject) => {
  const deferred = Q.defer();
  const hash = createHash(algo);
  const s = createReadStream(path);
  s.on('data', data => {
    hash.update(data);
  });
  s.on('end', function () {
    deferred.resolve(hash.digest('hex'));
  });
  s.on('error', function (e) {
    deferred.reject(e);
  });

  return deferred.promise;
};

function addExtraFieldsAsync(path: string, inspectObj: IInspectItem, options: IInspectOptions) {
  if (inspectObj.type === EInspectItemType.FILE && options.checksum) {
    return fileChecksumAsync(path, options.checksum)
      .then(checksum => {
        inspectObj[options.checksum] = checksum;
        return inspectObj;
      });
  } else if (inspectObj.type === 'symlink') {
    return promisedReadlink(path)
      .then(linkPath => {
        inspectObj.pointsAt = linkPath;
        return inspectObj;
      });
  }
  return new Q(inspectObj);
}

export function async(path: string, options?: IInspectOptions) {
  return new Promise((resolve, reject) => {
    options = options || {} as IInspectOptions;
    const statOperation = options.symlinks ? promisedLstat : promisedStat;
    statOperation(path)
      .then((stat: Stats) => {
        const inspectObj: IInspectItem = createInspectObj(path, options, stat);
        addExtraFieldsAsync(path, inspectObj, options).then(resolve, reject);
      })
      .catch(err => (err.code === 'ENOENT' ? resolve(undefined) : reject(err)));
  });
}


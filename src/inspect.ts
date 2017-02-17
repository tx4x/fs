import { Stats, readlinkSync, statSync, lstatSync, stat, lstat, readlink, createReadStream, readFileSync } from 'fs';
import * as  pathUtil from "path";
import * as Q from 'q';
import { validateArgument, validateOptions } from './utils/validate';
import { createHash } from 'crypto';
export const supportedChecksumAlgorithms: string[] = ['md5', 'sha1', 'sha256', 'sha512'];
export function validateInput(methodName: string, path: string, options: any): void {
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

function createInspectObj(path, options, stat) {
  let obj: any = {};
  obj.name = pathUtil.basename(path);
  if (stat.isFile()) {
    obj.type = 'file';
    obj.size = stat.size;
  } else if (stat.isDirectory()) {
    obj.type = 'dir';
  } else if (stat.isSymbolicLink()) {
    obj.type = 'symlink';
  } else {
    obj.type = 'other';
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

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
function fileChecksum(path: string, algo: string) {
  const hash = createHash(algo);
  const data = readFileSync(path);
  hash.update(data);
  return hash.digest('hex');
};

function addExtraFieldsSync(path: string, inspectObj: any, options: any) {
  if (inspectObj.type === 'file' && options.checksum) {
    inspectObj[options.checksum] = fileChecksum(path, options.checksum);
  } else if (inspectObj.type === 'symlink') {
    inspectObj.pointsAt = readlinkSync(path);
  }
};

export function sync(path, options?: any) {
  let statOperation = statSync;
  let stat: Stats;
  let inspectObj: any;
  options = options || {};
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

const promisedStat = Q.denodeify(stat);
const promisedLstat = Q.denodeify(lstat);
const promisedReadlink = Q.denodeify(readlink);

function fileChecksumAsync(path: string, algo: string) {
  return new Promise((resolve, reject) => {
    const hash = createHash(algo);
    const s = createReadStream(path);
    s.on('data', data => {
      hash.update(data);
    });
    s.on('end', () => {
      resolve(hash.digest('hex'));
    });
    s.on('error', reject);
  });
};

function addExtraFieldsAsync(path: string, inspectObj, options) {
  return new Promise((resolve, reject) => {
    if (inspectObj.type === 'file' && options.checksum) {
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
  });
}

export function async(path: string, options?:any) {
  var deferred = Q.defer();
  var statOperation = promisedStat;
  options = options || {};

  if (options.symlinks) {
    statOperation = promisedLstat;
  }

  statOperation(path)
    .then(function (stat) {
      var inspectObj = createInspectObj(path, options, stat);
      addExtraFieldsAsync(path, inspectObj, options)
        .then(deferred.resolve, deferred.reject);
    })
    .catch(function (err) {
      // Detection if path exists
      if (err.code === 'ENOENT') {
        // Doesn't exist. Return undefined instead of throwing.
        deferred.resolve(undefined);
      } else {
        deferred.reject(err);
      }
    });

  return deferred.promise;
}


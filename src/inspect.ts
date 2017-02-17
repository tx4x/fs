import * as fs from 'fs';
const crypto = require('crypto');
import * as  pathUtil from "path";
import * as Q from 'q';
import {argument,options} from './utils/validate';

var supportedChecksumAlgorithms = ['md5', 'sha1', 'sha256', 'sha512'];

export function validateInput(methodName:string, path:string, options:any):void {
  const methodSignature:string = methodName + '(path, [options])';
  argument(methodSignature, 'path', path, ['string']);
  options(methodSignature, 'options', options, {
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
  let obj:any = {};
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
function fileChecksum(path:string, algo:string) {
  const hash = crypto.createHash(algo);
  const data = fs.readFileSync(path);
  hash.update(data);
  return hash.digest('hex');
};

function addExtraFieldsSync(path:string, inspectObj:any, options:any) {
  if (inspectObj.type === 'file' && options.checksum) {
    inspectObj[options.checksum] = fileChecksum(path, options.checksum);
  } else if (inspectObj.type === 'symlink') {
    inspectObj.pointsAt = fs.readlinkSync(path);
  }
};

var inspectSync = function (path, options) {
  var statOperation = fs.statSync;
  var stat;
  var inspectObj;
  options = options || {};

  if (options.symlinks) {
    statOperation = fs.lstatSync;
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

var promisedStat = Q.denodeify(fs.stat);
var promisedLstat = Q.denodeify(fs.lstat);
var promisedReadlink = Q.denodeify(fs.readlink);

var fileChecksumAsync = function (path, algo) {
  var deferred = Q.defer();

  var hash = crypto.createHash(algo);
  var s = fs.createReadStream(path);
  s.on('data', function (data) {
    hash.update(data);
  });
  s.on('end', function () {
    deferred.resolve(hash.digest('hex'));
  });
  s.on('error', deferred.reject);

  return deferred.promise;
};

var addExtraFieldsAsync = function (path, inspectObj, options) {
  if (inspectObj.type === 'file' && options.checksum) {
    return fileChecksumAsync(path, options.checksum)
    .then(function (checksum) {
      inspectObj[options.checksum] = checksum;
      return inspectObj;
    });
  } else if (inspectObj.type === 'symlink') {
    return promisedReadlink(path)
    .then(function (linkPath) {
      inspectObj.pointsAt = linkPath;
      return inspectObj;
    });
  }
  return new Q(inspectObj);
};

var inspectAsync = function (path, options) {
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
};

// ---------------------------------------------------------
// API
// ---------------------------------------------------------

exports.supportedChecksumAlgorithms = supportedChecksumAlgorithms;
exports.validateInput = validateInput;
exports.sync = inspectSync;
exports.async = inspectAsync;

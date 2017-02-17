import * as fs from 'fs';
import * as Q from 'q';
import { argument } from './utils/validate';
export function validateInput(methodName, path) {
  var methodSignature = methodName + '(path)';
  argument(methodSignature, 'path', path, ['string']);
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

export function sync(path) {
  var stat;
  try {
    stat = fs.statSync(path);
    if (stat.isDirectory()) {
      return 'dir';
    } else if (stat.isFile()) {
      return 'file';
    }
    return 'other';
  } catch (err) {
    if (err.code !== 'ENOENT' && err.code !== 'ENOTDIR') {
      throw err;
    }
  }

  return false;
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

export function async(path) {
  var deferred = Q.defer();

  fs.stat(path, function (err, stat) {
    if (err) {
      if (err.code === 'ENOENT' || err.code === 'ENOTDIR') {
        deferred.resolve(false);
      } else {
        deferred.reject(err);
      }
    } else if (stat.isDirectory()) {
      deferred.resolve('dir');
    } else if (stat.isFile()) {
      deferred.resolve('file');
    } else {
      deferred.resolve('other');
    }
  });

  return deferred.promise;
};

// ---------------------------------------------------------
// API
// ---------------------------------------------------------

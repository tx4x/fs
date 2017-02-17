import * as fs from 'fs';
import * as Q from 'q';
import { argument } from './utils/validate';
export function validateInput(methodName: string, path: string) {
  const methodSignature = methodName + '(path)';
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
  return new Promise((resolve, reject) => {
    fs.stat(path, function (err, stat) {
      if (err) {
        if (err.code === 'ENOENT' || err.code === 'ENOTDIR') {
          resolve(false);
        } else {
          reject(err);
        }
      } else if (stat.isDirectory()) {
        resolve('dir');
      } else if (stat.isFile()) {
        resolve('file');
      } else {
        resolve('other');
      }
    });
  });
};
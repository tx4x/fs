import { Stats, statSync, stat } from 'fs';
import { validateArgument } from './utils/validate';

export function validateInput(methodName: string, path: string) {
  const methodSignature = methodName + '(path)';
  validateArgument(methodSignature, 'path', path, ['string']);
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

export function sync(path) {
  let stat: Stats;
  try {
    stat = statSync(path);
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
    stat(path, function (err, stat) {
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
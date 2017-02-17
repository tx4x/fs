import * as Q from 'q';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as  pathUtil from "path";
import { argument, options } from './utils/validate';
import * as denodeify from 'denodeify';

export function validateInput(methodName, symlinkValue, path) {
  const methodSignature = methodName + '(symlinkValue, path)';
  argument(methodSignature, 'symlinkValue', symlinkValue, ['string']);
  argument(methodSignature, 'path', path, ['string']);
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

export function sync(symlinkValue, path): void {
  try {
    fs.symlinkSync(symlinkValue, path);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Parent directories don't exist. Just create them and rety.
      mkdirp.sync(pathUtil.dirname(path));
      fs.symlinkSync(symlinkValue, path);
    } else {
      throw err;
    }
  }
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

var promisedSymlink = Q.denodeify(fs.symlink);
var promisedMkdirp = Q.denodeify(mkdirp);

export function async(symlinkValue, path) {
  return new Promise((resolve, reject) => {
    promisedSymlink(symlinkValue, path)
      .then(resolve)
      .catch(err => {
        if (err.code === 'ENOENT') {
          // Parent directories don't exist. Just create them and rety.
          promisedMkdirp(pathUtil.dirname(path))
            .then(() => {
              return promisedSymlink(symlinkValue, path);
            })
            .then(resolve, reject);
        } else {
          reject(err);
        }
      });
  });
};
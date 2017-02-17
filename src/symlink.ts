import * as Q from 'q';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as  pathUtil from "path";
import { validateArgument } from './utils/validate';
import * as denodeify from 'denodeify';
export function validateInput(methodName, symlinkValue, path) {
  const methodSignature = methodName + '(symlinkValue, path)';
  validateArgument(methodSignature, 'symlinkValue', symlinkValue, ['string']);
  validateArgument(methodSignature, 'path', path, ['string']);
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
}

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
const promisedSymlink = Q.denodeify(fs.symlink);
const promisedMkdirp = Q.denodeify(mkdirp);
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
}
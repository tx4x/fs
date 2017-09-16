const Q = require('q');
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as  pathUtil from "path";
import { validateArgument } from './utils/validate';
const promisedSymlink = Q.denodeify(fs.symlink);
const promisedMkdirp = Q.denodeify(mkdirp);

export function validateInput(methodName: string, symlinkValue: string, path: string) {
  const methodSignature = methodName + '(symlinkValue, path)';
  validateArgument(methodSignature, 'symlinkValue', symlinkValue, ['string']);
  validateArgument(methodSignature, 'path', path, ['string']);
};
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

export function sync(symlinkValue: string, path: string): void {
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
export function async(symlinkValue: string, path: string):Promise<void> {
  return new Promise((resolve, reject) => {
    promisedSymlink(symlinkValue, path)
      .then(resolve)
      .catch((err: any) => {
        if (err.code === 'ENOENT') {
          // Parent directories don't exist. Just create them and rety.
          promisedMkdirp(pathUtil.dirname(path))
            .then(() => { return promisedSymlink(symlinkValue, path); })
            .then(resolve, reject);
        } else {
          reject(err);
        }
      });
  });
}

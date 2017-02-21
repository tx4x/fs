import * as  pathUtil from "path";
import { rename, renameSync } from 'fs';
import * as denodeify from 'denodeify';
import * as mkdirp from 'mkdirp';
import { async as existsAsync, sync as existsSync } from './exists';
import { validateArgument } from './utils/validate';

export function validateInput(methodName: string, from: string, to: string) {
  const methodSignature: string = methodName + '(from, to)';
  validateArgument(methodSignature, 'from', from, ['string']);
  validateArgument(methodSignature, 'to', to, ['string']);
};

const ErrDoesntExists = (path: string): Error => {
  const err = new Error("Path to move doesn't exist " + path);
  err['code'] = 'ENOENT';
  return err;
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

export function sync(from, to): void {
  try {
    renameSync(from, to);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      // We can't make sense of this error. Rethrow it.
      throw err;
    } else {
      // Ok, source or destination path doesn't exist.
      // Must do more investigation.
      if (!existsSync(from)) {
        throw ErrDoesntExists(from);
      }
      if (!existsSync(to)) {
        // Some parent directory doesn't exist. Create it.
        mkdirp.sync(pathUtil.dirname(to));
        // Retry the attempt
        renameSync(from, to);
      }
    }
  }
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

const promisedRename = denodeify(rename);
const promisedMkdirp = denodeify(mkdirp);

function ensureDestinationPathExistsAsync(to: string): Promise<null> {
  return new Promise<null>((resolve, reject) => {
    const destDir: string = pathUtil.dirname(to);
    existsAsync(destDir)
      .then(dstExists => {
        if (!dstExists) {
          promisedMkdirp(destDir)
            .then(resolve, reject);
        } else {
          // Hah, no idea.
          reject();
        }
      })
      .catch(reject);
  });
};

export function async(from: string, to: string): Promise<null> {
  return new Promise<null>((resolve, reject) => {
    promisedRename(from, to)
      .then(resolve)
      .catch(err => {
        if (err.code !== 'ENOENT') {
          // Something unknown. Rethrow original error.
          reject(err);
        } else {
          // Ok, source or destination path doesn't exist.
          // Must do more investigation.
          existsAsync(from)
            .then(srcExists => {
              if (!srcExists) {
                reject(ErrDoesntExists(from));
              } else {
                ensureDestinationPathExistsAsync(to)
                  // Retry the attempt
                  .then(() => { return promisedRename(from, to); })
                  .then(resolve, reject);
              }
            })
            .catch(reject);
        }
      });
  });
};
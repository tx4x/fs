import { readdirSync, readdir } from 'fs';
import * as Q from 'q';
import { validateArgument } from './utils/validate';

export function validateInput(methodName: string, path: string) {
  const methodSignature = methodName + '(path)';
  validateArgument(methodSignature, 'path', path, ['string', 'undefined']);
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
export function sync(path: string): string[] {
  try {
    return readdirSync(path);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Doesn't exist. Return undefined instead of throwing.
      return undefined;
    }
    throw err;
  }
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
const promisedReaddir = Q.denodeify(readdir);
export function async(path: string): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    promisedReaddir(path)
      .then(function (list) {
        resolve(list);
      })
      .catch(function (err) {
        if (err.code === 'ENOENT') {
          // Doesn't exist. Return undefined instead of throwing.
          resolve(undefined);
        } else {
          reject(err);
        }
      });
  });
};

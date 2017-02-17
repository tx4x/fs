import * as fs from 'fs';
import * as Q from 'q';
import { sync as writeSync, async as writeASync } from './write';
import { argument, options } from './utils/validate';
export function validateInput(methodName: string, path: string, data: any, options: any) {
  const methodSignature = methodName + '(path, data, [options])';
  argument(methodSignature, 'path', path, ['string']);
  argument(methodSignature, 'data', data, ['string', 'buffer']);
  options(methodSignature, 'options', options, {
    mode: ['string', 'number']
  });
};
// ---------------------------------------------------------
// SYNC
// ---------------------------------------------------------
export function sync(path, data, options) {
  try {
    fs.appendFileSync(path, data, options);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Parent directory doesn't exist, so just pass the task to `write`,
      // which will create the folder and file.
      writeSync(path, data, options);
    } else {
      throw err;
    }
  }
};

// ---------------------------------------------------------
// ASYNC
// ---------------------------------------------------------
const promisedAppendFile = Q.denodeify(fs.appendFile);
export function async(path, data, options) {
  return new Promise((resolve, reject) => {
    promisedAppendFile(path, data, options)
      .then(resolve)
      .catch(err => {
        if (err.code === 'ENOENT') {
          // Parent directory doesn't exist, so just pass the task to `write`,
          // which will create the folder and file.
          writeASync(path, data, options).then(resolve, reject);
        } else {
          reject(err);
        }
      });
  });
};

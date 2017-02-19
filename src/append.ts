import * as fs from 'fs';
import * as Q from 'q';
import { sync as writeSync, async as writeASync } from './write';
import { validateArgument, validateOptions } from './utils/validate';
export interface Options {
  mode: string;
  encoding?: string;
  flag?: string;
}
export function validateInput(methodName: string, path: string, data: any, options?: Options) {
  const methodSignature = methodName + '(path, data, [options])';
  validateArgument(methodSignature, 'path', path, ['string']);
  validateArgument(methodSignature, 'data', data, ['string', 'buffer']);
  validateOptions(methodSignature, 'options', options, {
    mode: ['string', 'number']
  });
};
// ---------------------------------------------------------
// SYNC
// ---------------------------------------------------------
export function sync(path: string, data: any, options: Options): void {
  try {
    fs.appendFileSync(path, data, options ? { encoding: options.encoding, mode: options.mode as string } : {});
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
export function async(path: string, data: string | Buffer | Object, options?: Options): Promise<null> {
  return new Promise((resolve, reject) => {
    promisedAppendFile(path, data, options)
      .then(resolve)
      .catch(err => {
        if (err.code === 'ENOENT') {
          // Parent directory doesn't exist, so just pass the task to `write`,
          // which will create the folder and file.
          writeASync(path, data, { mode: options.mode as string }).then(resolve, reject);
        } else {
          reject(err);
        }
      });
  });
};

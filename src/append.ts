import * as fs from 'fs';
const Q = require('q');
import { sync as writeSync, async as writeASync } from './write';
import { validateArgument, validateOptions } from './utils/validate';
// tslint:disable-next-line:interface-name
export interface Options {
  mode: string;
  encoding?: string;
  flag?: string;
}
export const validateInput = (methodName: string, path: string, data: any, options?: Options) => {
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
export const sync = (path: string, data: any, options: Options): void => {
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
export const async = (path: string, data: string | Buffer | Object, options?: Options): Promise<null> => {
  return new Promise((resolve, reject) => {
    promisedAppendFile(path, data, options)
      .then(resolve)
      .catch((err: any) => {
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

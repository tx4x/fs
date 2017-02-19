import * as pathUtil from "path";
import * as fs from 'fs';
import * as Q from 'q';
import * as mkdirp from 'mkdirp';
import { validateArgument, validateOptions } from './utils/validate';
export interface Options {
  atomic?: boolean;
  jsonIndent?: number;
  mode?: string;
}
export function validateInput(methodName: string, path: string, data, options: Options): void {
  let methodSignature = methodName + '(path, data, [options])';
  validateArgument(methodSignature, 'path', path, ['string']);
  validateArgument(methodSignature, 'data', data, ['string', 'buffer', 'object', 'array']);
  validateOptions(methodSignature, 'options', options, {
    atomic: ['boolean'],
    jsonIndent: ['number']
  });
};

// Temporary file extensions used for atomic file overwriting.
const newExt: string = '.__new__';
function serializeToJsonMaybe(data: string | Buffer | Object, jsonIndent: number): string {
  let indent: number = jsonIndent;
  if (typeof indent !== 'number') {
    indent = 2;
  }
  if (typeof data === 'object'
    && !Buffer.isBuffer(data)
    && data !== null) {
    return JSON.stringify(data, null, indent);
  }
  return data as string;
};

// ---------------------------------------------------------
// SYNC
// ---------------------------------------------------------
function writeFileSync(path: string, data: any | string, options?: Options): void {
  try {
    fs.writeFileSync(path, data, options);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // Means parent directory doesn't exist, so create it and try again.
      mkdirp.sync(pathUtil.dirname(path));
      fs.writeFileSync(path, data, options);
    } else {
      throw err;
    }
  }
};

function writeAtomicSync(path: string, data: string, options?: Options): void {
  // we are assuming there is file on given path, and we don't want
  // to touch it until we are sure our data has been saved correctly,
  // so write the data into temporary file...
  writeFileSync(path + newExt, data, options);
  // ...next rename temp file to replace real path.
  fs.renameSync(path + newExt, path);
};

export function sync(path: string, data: string | Buffer | Object, options?: any): void {
  const opts: any = options || {};
  const processedData = serializeToJsonMaybe(data, opts.jsonIndent);
  let writeStrategy = writeFileSync;
  if (opts.atomic) {
    writeStrategy = writeAtomicSync;
  }
  writeStrategy(path, processedData, { mode: opts.mode });
};

// ---------------------------------------------------------
// ASYNC
// ---------------------------------------------------------
const promisedRename = Q.denodeify(fs.rename);
const promisedWriteFile = Q.denodeify(fs.writeFile);
const promisedMkdirp = Q.denodeify(mkdirp);
function writeFileAsync(path: string, data: string, options?: any): Promise<null> {
  return new Promise<null>((resolve, reject) => {
    promisedWriteFile(path, data, options)
      .then(resolve)
      .catch(function (err) {
        // First attempt to write a file ended with error.
        // Check if this is not due to nonexistent parent directory.
        if (err.code === 'ENOENT') {
          // Parent directory doesn't exist, so create it and try again.
          promisedMkdirp(pathUtil.dirname(path))
            .then(function () {
              return promisedWriteFile(path, data, options);
            })
            .then(resolve, reject);
        } else {
          // Nope, some other error, throw it.
          reject(err);
        }
      });
  });
};

function writeAtomicAsync(path: string, data: string, options?: any): Promise<null> {
  return new Promise((resolve, reject) => {
    // We are assuming there is file on given path, and we don't want
    // to touch it until we are sure our data has been saved correctly,
    // so write the data into temporary file...
    writeFileAsync(path + newExt, data, options)
      .then(function () {
        // ...next rename temp file to real path.
        return promisedRename(path + newExt, path);
      })
      .then(resolve, reject);
  });
}

export function async(path: string, data: string | Buffer | Object, options?: Options): Promise<null> {
  let opts: any = options || {};
  let processedData: string = serializeToJsonMaybe(data, opts.jsonIndent);
  let writeStrategy = writeFileAsync;
  if (opts.atomic) {
    writeStrategy = writeAtomicAsync;
  }
  return writeStrategy(path, processedData, { mode: opts.mode });
};

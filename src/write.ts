import * as pathUtil from "path";
import * as fs from 'fs';
import { writeFileSync } from 'fs';
import * as Q from 'q';
import * as mkdirp from 'mkdirp';
import { json, file } from './imports';
import { WriteOptions } from './interfaces';
import { validateArgument, validateOptions } from './utils/validate';
// Temporary file extensions used for atomic file overwriting.
const newExt: string = '.__new__';
export function validateInput(methodName: string, path: string, data, options: WriteOptions): void {
  const methodSignature = methodName + '(path, data, [options])';
  validateArgument(methodSignature, 'path', path, ['string']);
  validateArgument(methodSignature, 'data', data, ['string', 'buffer', 'object', 'array']);
  validateOptions(methodSignature, 'options', options, {
    atomic: ['boolean'],
    jsonIndent: ['number'],
    progress: ['function']
  });
};

const toJson = (data: string | Buffer | Object, jsonIndent: number): string => {
  if (typeof data === 'object'
    && !Buffer.isBuffer(data)
    && data !== null) {
    return json.serialize(data, null, typeof jsonIndent !== 'number' ? 2 : jsonIndent);
  }
  return data as string;
};

// ---------------------------------------------------------
// SYNC
// ---------------------------------------------------------
const _writeFileSync = (path: string, data: any | string, options?: WriteOptions): void => {
  try {
    writeFileSync(path, data, options);
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

const writeAtomicSync = (path: string, data: string, options?: WriteOptions): void => {
  return file.write_atomic(path + newExt, data, options);
};

export function sync(path: string, data: string | Buffer | Object, options?: WriteOptions) {
  const opts: any = options || {};
  const processedData = toJson(data, opts.jsonIndent);
  const writeStrategy = opts.atomic ? writeAtomicSync : _writeFileSync;
  writeStrategy(path, processedData, { mode: opts.mode });
};

// ---------------------------------------------------------
// ASYNC
// ---------------------------------------------------------
const promisedRename = Q.denodeify(fs.rename);
const promisedWriteFile = Q.denodeify(fs.writeFile);
const promisedMkdirp = Q.denodeify(mkdirp);
function writeFileAsync(path: string, data: string, options?: WriteOptions): Promise<null> {
  return new Promise<null>((resolve, reject) => {
    promisedWriteFile(path, data, options)
      .then(resolve)
      .catch(err => {
        // First attempt to write a file ended with error.
        // Check if this is not due to nonexistent parent directory.
        if (err.code === 'ENOENT') {
          // Parent directory doesn't exist, so create it and try again.
          promisedMkdirp(pathUtil.dirname(path))
            .then(() => promisedWriteFile(path, data, options))
            .then(resolve, reject);
        } else {
          // Nope, some other error, throw it.
          reject(err);
        }
      });
  });
};

function writeAtomicAsync(path: string, data: string, options?: WriteOptions): Promise<null> {
  return new Promise((resolve, reject) => {
    // We are assuming there is file on given path, and we don't want
    // to touch it until we are sure our data has been saved correctly,
    // so write the data into temporary file...
    writeFileAsync(path + newExt, data, options)
      // ...next rename temp file to real path.
      .then(() => promisedRename(path + newExt, path))
      .then(resolve, reject);
  });
}

export function async(path: string, data: string | Buffer | Object, options?: WriteOptions): Promise<null> {
  const opts: any = options || {};
  const processedData: string = toJson(data, opts.jsonIndent);
  return (opts.atomic ? writeAtomicAsync : writeFileAsync)(path, processedData, { mode: opts.mode });
};

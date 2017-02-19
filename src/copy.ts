import * as  pathUtil from "path";
import * as fs from 'fs';
import { symlinkSync, readFileSync } from 'fs';
import * as Q from 'q';
import * as mkdirp from 'mkdirp';
import { sync as existsSync, async as existsASync } from './exists';
import { create as matcher } from './utils/matcher';
import { normalizeFileMode as fileMode } from './utils/mode';
import { sync as treeWalkerSync, stream as treeWalkerStream } from './utils/tree_walker';
import { validateArgument, validateOptions } from './utils/validate';
import { sync as writeSync, Options as WriteOptions, ProgressCallback as WriteProgressCallback } from './write';
import { InspectItem } from './inspect';
const progress = require('progress-stream');
export interface Options {
  overwrite?: boolean;
  matching?: string[];
  progress?(path: string, current: number, total: number, item?: any): void;
  allowedToCopy?: (from: string) => boolean;
}
export interface CopyTask {
  path: string;
  item: InspectItem;
  dst: string;
  done: boolean;
}
export function validateInput(methodName: string, from: string, to: string, options?: Options): void {
  const methodSignature = methodName + '(from, to, [options])';
  validateArgument(methodSignature, 'from', from, ['string']);
  validateArgument(methodSignature, 'to', to, ['string']);
  validateOptions(methodSignature, 'options', options, {
    overwrite: ['boolean'],
    matching: ['string', 'array of string'],
    progress: ['function']
  });
};

function parseOptions(options: any | null, from: string) {
  const opts: any = options || {};
  const parsedOptions: Options = {};
  parsedOptions.overwrite = opts.overwrite;
  parsedOptions.progress = opts.progress;
  if (opts.matching) {
    parsedOptions.allowedToCopy = matcher(from, opts.matching);
  } else {
    parsedOptions.allowedToCopy = function () {
      // Default behaviour - copy everything.
      return true;
    };
  }
  return parsedOptions;
};

function generateNoSourceError(path: string): Error {
  const err: any = new Error("Path to copy doesn't exist " + path);
  err.code = 'ENOENT';
  return err;
};

function generateDestinationExistsError(path): Error {
  const err: any = new Error('Destination path already exists ' + path);
  err.code = 'EEXIST';
  return err;
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

function checksBeforeCopyingSync(from: string, to: string, opts?: any) {
  if (!existsSync(from)) {
    throw generateNoSourceError(from);
  }

  if (existsSync(to) && !opts.overwrite) {
    throw generateDestinationExistsError(to);
  }
};
async function copyFileSyncWithProgress(from: string, to: string, options?: Options) {
  return new Promise((resolve, reject) => {
    let cbCalled = false;
    function done(err?: any) {
      if (!cbCalled) {
        cbCalled = true;
        resolve();
      }
    }
    let rd = fs.createReadStream(from);
    let str = progress({
      length: fs.statSync(from).size,
      time: 100
    });
    str.on('progress', e => {
      options.progress(from, e.transferred, e.length);
    });
    rd.on("error", err => {
      done(err);
    });

    let wr = fs.createWriteStream(to);
    wr.on("error", err => {
      done(err);
    });
    wr.on("close", done);
    rd.pipe(str).pipe(wr);
  });
};
async function copyFileSync(from: string, to: string, mode, options?: Options) {
  const data = readFileSync(from);
  const writeOptions: WriteOptions = {
    mode: mode
  };
  if (options.progress) {
    await copyFileSyncWithProgress(from, to, options);
  } else {
    writeSync(to, data as any, writeOptions);
  }
};

function copySymlinkSync(from: string, to: string) {
  const symlinkPointsAt = fs.readlinkSync(from);
  try {
    symlinkSync(symlinkPointsAt, to);
  } catch (err) {
    // There is already file/symlink with this name on destination location.
    // Must erase it manually, otherwise system won't allow us to place symlink there.
    if (err.code === 'EEXIST') {
      fs.unlinkSync(to);
      // Retry...
      fs.symlinkSync(symlinkPointsAt, to);
    } else {
      throw err;
    }
  }
};

function copyItemSync(from: string, inspectData: InspectItem, to: string, options: Options) {
  const mode: string = fileMode(inspectData.mode);
  if (inspectData.type === 'dir') {
    mkdirp.sync(to, { mode: parseInt(mode, 8), fs: null });
  } else if (inspectData.type === 'file') {
    copyFileSync(from, to, mode, options);
  } else if (inspectData.type === 'symlink') {
    copySymlinkSync(from, to);
  }
};

export function sync(from: string, to: string, options?: Options) {
  const opts = parseOptions(options, from);
  checksBeforeCopyingSync(from, to, opts);
  let nodes: CopyTask[] = [];
  let current: number = 0;
  let sizeTotal: number = 0;
  treeWalkerSync(from, {
    inspectOptions: {
      mode: true,
      symlinks: true
    }
  }, (path: string, inspectData: InspectItem) => {

    const rel = pathUtil.relative(from, path);
    const destPath = pathUtil.resolve(to, rel);
    if (opts.allowedToCopy(path)) {
      nodes.push({
        path: path,
        item: inspectData,
        dst: destPath,
        done: false
      });
      sizeTotal += inspectData.size;
    }
  });
  nodes.forEach(item => {
    copyItemSync(item.path, item.item, item.dst, options);
    current++;
    if (opts.progress) {
      opts.progress(item.path, current, nodes.length, item.item);
    }
  });
  console.log('items: ', nodes.length);
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

const promisedSymlink = Q.denodeify(fs.symlink);
const promisedReadlink = Q.denodeify(fs.readlink);
const promisedUnlink = Q.denodeify(fs.unlink);
const promisedMkdirp = Q.denodeify(mkdirp);

function checksBeforeCopyingAsync(from: string, to: string, opts?: Options) {
  return existsASync(from)
    .then(srcPathExists => {
      if (!srcPathExists) {
        throw generateNoSourceError(from);
      } else {
        return existsASync(to);
      }
    })
    .then(destPathExists => {
      if (destPathExists && !opts.overwrite) {
        throw generateDestinationExistsError(to);
      }
    });
};

function copyFileAsync(from: string, to: string, mode: any, retriedAttempt?: any) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(from);
    const writeStream = fs.createWriteStream(to, { mode: mode });
    readStream.on('error', reject);
    writeStream.on('error', function (err) {
      const toDirPath = pathUtil.dirname(to);
      // Force read stream to close, since write stream errored
      // read stream serves us no purpose.
      readStream.resume();
      if (err.code === 'ENOENT' && retriedAttempt === undefined) {
        // Some parent directory doesn't exits. Create it and retry.
        promisedMkdirp(toDirPath).then(() => {
          // Make retry attempt only once to prevent vicious infinite loop
          // (when for some obscure reason I/O will keep returning ENOENT error).
          // Passing retriedAttempt = true.
          copyFileAsync(from, to, mode, true)
            .then(resolve)
            .catch(reject);
        });
      } else {
        reject(err);
      }
    });

    writeStream.on('finish', resolve);

    readStream.pipe(writeStream);
  });
};

function copySymlinkAsync(from: string, to: string) {
  return promisedReadlink(from)
    .then(function (symlinkPointsAt) {
      return new Promise((resolve, reject) => {
        promisedSymlink(symlinkPointsAt, to)
          .then(resolve)
          .catch(err => {
            if (err.code === 'EEXIST') {
              // There is already file/symlink with this name on destination location.
              // Must erase it manually, otherwise system won't allow us to place symlink there.
              promisedUnlink(to)
                .then(function () {
                  // Retry...
                  return promisedSymlink(symlinkPointsAt, to);
                })
                .then(resolve, reject);
            } else {
              reject(err);
            }
          });
      });
    });
};

function copyItemAsync(from: string, inspectData: any, to: string) {
  const mode = fileMode(inspectData.mode);
  if (inspectData.type === 'dir') {
    return promisedMkdirp(to, { mode: mode });
  } else if (inspectData.type === 'file') {
    return copyFileAsync(from, to, mode);
  } else if (inspectData.type === 'symlink') {
    return copySymlinkAsync(from, to);
  }
  // Ha! This is none of supported file system entities. What now?
  // Just continuing without actually copying sounds sane.
  return new Q();
};

export function async(from: string, to: string, options?: Options) {
  const opts = parseOptions(options, from);
  return new Promise((resolve, reject) => {
    checksBeforeCopyingAsync(from, to, opts).then(function () {
      let allFilesDelivered: boolean = false;
      let filesInProgress: number = 0;
      const stream = treeWalkerStream(from, {
        inspectOptions: {
          mode: true,
          symlinks: true
        }
      }).on('readable', function () {
        const item = stream.read();
        let rel: string;
        let destPath: string;
        if (item) {
          rel = pathUtil.relative(from, item.path);
          destPath = pathUtil.resolve(to, rel);
          if (opts.allowedToCopy(item.path)) {
            filesInProgress += 1;
            copyItemAsync(item.path, item.item, destPath)
              .then(function () {
                filesInProgress -= 1;
                if (allFilesDelivered && filesInProgress === 0) {
                  resolve();
                }
              })
              .catch(reject);
          }
        }
      }).on('error', reject)
        .on('end', function () {
          allFilesDelivered = true;
          if (allFilesDelivered && filesInProgress === 0) {
            resolve();
          }
        });
    }).catch(reject);
  });
};
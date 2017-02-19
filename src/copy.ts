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
import { sync as writeSync, Options as WriteOptions } from './write';
import { ICopyOptions, ECopyOverwriteMode, ItemProgressCallback, WriteProgressCallback } from './interfaces';
import * as  progress from 'progress-stream';
import { IInspectItem, IInspectOptions, EInspectItemType } from './interfaces';

interface ICopyTask {
  path: string;
  item: IInspectItem;
  dst: string;
  done: boolean;
}

export function validateInput(methodName: string, from: string, to: string, options?: ICopyOptions): void {
  const methodSignature = methodName + '(from, to, [options])';
  validateArgument(methodSignature, 'from', from, ['string']);
  validateArgument(methodSignature, 'to', to, ['string']);
  validateOptions(methodSignature, 'options', options, {
    overwrite: ['boolean'],
    matching: ['string', 'array of string'],
    progress: ['function'],
    writeProgress: ['function']
  });
};

function parseOptions(options: any | null, from: string): ICopyOptions {
  const opts: any = options || {};
  const parsedOptions: ICopyOptions = {};
  parsedOptions.overwrite = opts.overwrite;
  parsedOptions.progress = opts.progress;
  parsedOptions.writeProgress = opts.writeProgress;
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

function checksBeforeCopyingSync(from: string, to: string, options?: ICopyOptions) {
  if (!existsSync(from)) {
    throw generateNoSourceError(from);
  }

  if (existsSync(to) && !options.overwrite) {
    throw generateDestinationExistsError(to);
  }
};
async function copyFileSyncWithProgress(from: string, to: string, options?: ICopyOptions) {
  return new Promise((resolve, reject) => {
    let cbCalled = false;
    const started = Date.now();
    let elapsed = Date.now();
    let speed = 0;
    function done(err?: any) {
      if (!cbCalled) {
        cbCalled = true;
        resolve();
      }
    }
    const rd = fs.createReadStream(from);
    const str = progress({
      length: fs.statSync(from).size,
      time: 100
    });
    str.on('progress', e => {
      elapsed = (Date.now() - started) / 1000;
      speed = e.transferred / elapsed;
      options.writeProgress(from, e.transferred, e.length);
    });
    rd.on("error", err => done(err));
    const wr = fs.createWriteStream(to);
    wr.on("error", err => done(err));
    wr.on("close", done);
    rd.pipe(str).pipe(wr);
  });
};
async function copyFileSync(from: string, to: string, mode, options?: ICopyOptions) {
  const data = readFileSync(from);
  const writeOptions: WriteOptions = {
    mode: mode
  };
  if (options.writeProgress) {
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
async function copyItemSync(from: string, inspectData: IInspectItem, to: string, options: ICopyOptions) {
  const mode: string = fileMode(inspectData.mode);
  if (inspectData.type === EInspectItemType.DIR) {
    mkdirp.sync(to, { mode: parseInt(mode, 8), fs: null });
  } else if (inspectData.type === EInspectItemType.FILE) {
    await copyFileSync(from, to, mode, options);
  } else if (inspectData.type === EInspectItemType.SYMLINK) {
    copySymlinkSync(from, to);
  }
};
export function sync(from: string, to: string, options?: ICopyOptions) {
  const opts = parseOptions(options, from);
  checksBeforeCopyingSync(from, to, opts);
  let nodes: ICopyTask[] = [];
  let current: number = 0;
  let sizeTotal: number = 0;
  treeWalkerSync(from, {
    inspectOptions: {
      mode: true,
      symlinks: true
    }
  }, (path: string, inspectData: IInspectItem) => {
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
  Promise.all(nodes.map(async (item) => {
    await copyItemSync(item.path, item.item, item.dst, options);
    current++;
    if (opts.progress) {
      opts.progress(item.path, current, nodes.length, item.item);
    }
  }));
  /*
  nodes.forEach(item => {
    copyItemSync(item.path, item.item, item.dst, options);
    current++;
    if (opts.progress) {
      opts.progress(item.path, current, nodes.length, item.item);    
    }
  });  
  */
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
const promisedSymlink = Q.denodeify(fs.symlink);
const promisedReadlink = Q.denodeify(fs.readlink);
const promisedUnlink = Q.denodeify(fs.unlink);
const promisedMkdirp = Q.denodeify(mkdirp);

function checksBeforeCopyingAsync(from: string, to: string, opts?: ICopyOptions) {
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

export function async(from: string, to: string, options?: ICopyOptions) {
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
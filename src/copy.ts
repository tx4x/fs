import * as  pathUtil from "path";
import * as fs from 'fs';
import { symlinkSync, readFileSync } from 'fs';
const Q = require('q');
const mkdirp = require('mkdirp');
import { sync as existsSync, async as existsASync } from './exists';
import { create as matcher } from './utils/matcher';
import { normalizeFileMode as fileMode } from './utils/mode';
import { sync as treeWalkerSync, stream as treeWalkerStream } from './utils/tree_walker';
import { validateArgument, validateOptions } from './utils/validate';
import { sync as writeSync } from './write';
export function validateInput(methodName: string, from: string, to: string, options: any): void {
  const methodSignature = methodName + '(from, to, [options])';
  validateArgument(methodSignature, 'from', from, ['string']);
  validateArgument(methodSignature, 'to', to, ['string']);
  validateOptions(methodSignature, 'options', options, {
    overwrite: ['boolean'],
    matching: ['string', 'array of string']
  });
};

function parseOptions(options: any | null, from: string) {
  const opts: any = options || {};
  const parsedOptions: any = {};
  parsedOptions.overwrite = opts.overwrite;
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

function checksBeforeCopyingSync(from: string, to: string, opts: any) {
  if (!existsSync(from)) {
    throw generateNoSourceError(from);
  }

  if (existsSync(to) && !opts.overwrite) {
    throw generateDestinationExistsError(to);
  }
};

function copyFileSync(from: string, to: string, mode) {
  const data = readFileSync(from);
  writeSync(to, data as any, { mode: mode });
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

function copyItemSync(from: string, inspectData: any, to: string) {
  const mode = fileMode(inspectData.mode);
  if (inspectData.type === 'dir') {
    mkdirp.sync(to, { mode: parseInt(mode), fs: null });
  } else if (inspectData.type === 'file') {
    copyFileSync(from, to, mode);
  } else if (inspectData.type === 'symlink') {
    copySymlinkSync(from, to);
  }
};

export function sync(from, to, options) {
  const opts = parseOptions(options, from);
  checksBeforeCopyingSync(from, to, opts);
  treeWalkerSync(from, {
    inspectOptions: {
      mode: true,
      symlinks: true
    }
  }, (path, inspectData) => {
    const rel = pathUtil.relative(from, path);
    const destPath = pathUtil.resolve(to, rel);
    if (opts.allowedToCopy(path)) {
      copyItemSync(path, inspectData, destPath);
    }
  });
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

const promisedSymlink = Q.denodeify(fs.symlink);
const promisedReadlink = Q.denodeify(fs.readlink);
const promisedUnlink = Q.denodeify(fs.unlink);
const promisedMkdirp = Q.denodeify(mkdirp);

function checksBeforeCopyingAsync(from: string, to: string, opts: any) {
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

export function async(from: string, to: string, options: any) {
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
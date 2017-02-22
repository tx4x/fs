import * as pathUtil from 'path';
import { Stats, stat, statSync, chmod, chmodSync, readdirSync, readdir } from 'fs';
import * as rimraf from 'rimraf';
import { normalizeFileMode as modeUtil } from './utils/mode';
import { validateArgument, validateOptions } from './utils/validate';
const Q = require('q');
const mkdirp = require('mkdirp');
export interface Options {
  empty?: boolean;
  mode?: number | string;
}

export const validateInput = function (methodName: string, path: string, criteria?: Options) {
  let methodSignature = methodName + '(path, [criteria])';
  validateArgument(methodSignature, 'path', path, ['string']);
  validateOptions(methodSignature, 'criteria', criteria, {
    empty: ['boolean'],
    mode: ['string', 'number']
  });
};

const defaults = (passedOptions?: Options): Options => {
  const result = passedOptions || {};
  if (typeof result.empty !== 'boolean') {
    result.empty = false;
  }
  if (result.mode !== undefined) {
    result.mode = modeUtil(result.mode);
  }
  return result;
};

const ErrNoDirectory = (path: string): Error => {
  return new Error('Path ' + path + ' exists but is not a directory.' +
    ' Halting jetpack.dir() call for safety reasons.');
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

function checkWhatAlreadyOccupiesPathSync(path: string): Stats {
  let stat: Stats;
  try {
    stat = statSync(path);
  } catch (err) {
    // Detection if path already exists
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }

  if (stat && !stat.isDirectory()) {
    throw ErrNoDirectory(path);
  }

  return stat;
};

function createBrandNewDirectorySync(path: string, criteria: Options) {
  mkdirp.sync(path, { mode: criteria.mode });
};

function checkExistingDirectoryFulfillsCriteriaSync(path: string, stat: Stats, criteria: Options) {
  const checkMode = function () {
    const mode = modeUtil(stat.mode);
    if (criteria.mode !== undefined && criteria.mode !== mode) {
      chmodSync(path, criteria.mode as string);
    }
  };
  const checkEmptiness = function () {
    let list: string[];
    if (criteria.empty) {
      // Delete everything inside this directory
      list = readdirSync(path);
      list.forEach(function (filename) {
        rimraf.sync(pathUtil.resolve(path, filename));
      });
    }
  };
  checkMode();
  checkEmptiness();
};

export function sync(path: string, passedCriteria?: Options) {
  let criteria = defaults(passedCriteria);
  let stat = checkWhatAlreadyOccupiesPathSync(path);
  if (stat) {
    checkExistingDirectoryFulfillsCriteriaSync(path, stat, criteria);
  } else {
    createBrandNewDirectorySync(path, criteria);
  }
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

const promisedStat = Q.denodeify(stat);
const promisedChmod = Q.denodeify(chmod);
const promisedReaddir = Q.denodeify(readdir);
const promisedRimraf = Q.denodeify(rimraf);
const promisedMkdirp = Q.denodeify(mkdirp);

async function checkWhatAlreadyOccupiesPathAsync(path: string): Promise<Stats> {
  return new Promise<Stats>((resolve, reject) => {
    promisedStat(path)
      .then(function (stat: any) {
        if (stat.isDirectory()) {
          resolve(stat);
        } else {
          reject(ErrNoDirectory(path));
        }
      })
      .catch(function (err:any) {
        if (err.code === 'ENOENT') {
          // Path doesn't exist
          resolve(undefined);
        } else {
          // This is other error that nonexistent path, so end here.
          reject(err);
        }
      });

  });
};

// Delete all files and directores inside given directory
function emptyAsync(path: string) {
  return new Promise((resolve, reject) => {
    promisedReaddir(path)
      .then(function (list: any[]) {
        const doOne = function (index: number) {
          let subPath: string;
          if (index === list.length) {
            resolve();
          } else {
            subPath = pathUtil.resolve(path, list[index]);
            promisedRimraf(subPath).then(function () {
              doOne(index + 1);
            });
          }
        };
        doOne(0);
      })
      .catch(reject);
  });
};
const checkMode = function (criteria: Options, stat: Stats, path: string): Promise<null> {
  const mode = modeUtil(stat.mode);
  if (criteria.mode !== undefined && criteria.mode !== mode) {
    return promisedChmod(path, criteria.mode);
  }
  return Promise.resolve(null);
};

const checkExistingDirectoryFulfillsCriteriaAsync = (path: string, stat: Stats, options: Options) => {
  return new Promise((resolve, reject) => {
    const checkEmptiness = function () {
      if (options.empty) {
        return emptyAsync(path);
      }
      return Promise.resolve();
    };
    checkMode(options, stat, path)
      .then(checkEmptiness)
      .then(resolve, reject);
  });
};

const createBrandNewDirectoryAsync = (path: string, criteria: Options): Promise<null> => {
  return promisedMkdirp(path, { mode: criteria.mode });
};

export function async(path: string, passedCriteria?: Options) {
  const criteria = defaults(passedCriteria);
  return new Promise((resolve, reject) => {
    checkWhatAlreadyOccupiesPathAsync(path)
      .then((stat: Stats) => {
        if (stat !== undefined) {
          return checkExistingDirectoryFulfillsCriteriaAsync(path, stat, criteria);
        }
        return createBrandNewDirectoryAsync(path, criteria);
      })
      .then(resolve, reject);
  });
}

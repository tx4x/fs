import * as pathUtil from 'path';
import { Stats, stat, statSync, chmod, chmodSync, readdirSync, readdir } from 'fs';
import * as rimraf from 'rimraf';
import { normalizeFileMode as modeUtil } from './utils/mode';
import { validateArgument, validateOptions } from './utils/validate';
import { ErrNoDirectory } from './errors';
import { EError } from './interfaces';
import { promisify } from './promisify';
import * as  mkdirp from 'mkdirp';

export interface IOptions {
  empty?: boolean;
  mode?: number | string;
}

export const validateInput = function (methodName: string, path: string, options?: IOptions) {
  let methodSignature = methodName + '(path, [criteria])';
  validateArgument(methodSignature, 'path', path, ['string']);
  validateOptions(methodSignature, 'criteria', options, {
    empty: ['boolean'],
    mode: ['string', 'number']
  });
};

const defaults = (options?: IOptions): IOptions => {
  const result = options || {};
  if (typeof result.empty !== 'boolean') {
    result.empty = false;
  }
  if (result.mode !== undefined) {
    result.mode = modeUtil(result.mode);
  }
  return result;
};


// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
const dirStatsSync = (path: string): Stats => {
  let stat: Stats;
  try {
    stat = statSync(path);
  } catch (err) {
    // Detection if path already exists
    if (err.code !== EError.NOEXISTS) {
      throw err;
    }
  }

  if (stat && !stat.isDirectory()) {
    throw ErrNoDirectory(path);
  }

  return stat;
};

function mkdirSync(path: string, criteria: IOptions) {
  mkdirp.sync(path, { mode: criteria.mode as number,fs:null });
};

function checkDirSync(path: string, stat: Stats, options: IOptions) {
  const checkMode = function () {
    const mode = modeUtil(stat.mode);
    if (options.mode !== undefined && options.mode !== mode) {
      chmodSync(path, options.mode as string);
    }
  };
  const checkEmptiness = function () {
    let list: string[];
    if (options.empty) {
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

export function sync(path: string, options?: IOptions) {
  let criteria = defaults(options);
  let stat = dirStatsSync(path);
  if (stat) {
    checkDirSync(path, stat, criteria);
  } else {
    mkdirSync(path, criteria);
  }
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

const promisedStat = promisify(stat);
const promisedChmod = promisify<string | Buffer, string, Function>(chmod);
const promisedReaddir = promisify(readdir);
const promisedRimraf = promisify<string, Function>(rimraf);
const promisedMkdirp = promisify<string, any, Function>(mkdirp);

async function dirStatAsync(path: string): Promise<Stats> {
  return new Promise<Stats>((resolve, reject) => {
    promisedStat(path)
      .then(function (stat: any) {
        if (stat.isDirectory()) {
          resolve(stat);
        } else {
          reject(ErrNoDirectory(path));
        }
      })
      .catch((err: any) => (err.code === EError.NOEXISTS ? resolve(undefined) : reject(err)));

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
const checkMode = function (criteria: IOptions, stat: Stats, path: string): Promise<null> {
  const mode = modeUtil(stat.mode);
  if (criteria.mode !== undefined && criteria.mode !== mode) {
    return promisedChmod(path, <string>criteria.mode);
  }
  return Promise.resolve(null);
};

const checkDirAsync = (path: string, stat: Stats, options: IOptions) => {
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

const mkdirAsync = (path: string, criteria: IOptions): Promise<null> => {
  return promisedMkdirp(path, { mode: criteria.mode });
};

export function async(path: string, passedCriteria?: IOptions) {
  const criteria = defaults(passedCriteria);
  return new Promise((resolve, reject) => {
    dirStatAsync(path)
      .then((stat: Stats) => {
        if (stat !== undefined) {
          return checkDirAsync(path, stat, criteria);
        }
        return mkdirAsync(path, criteria);
      })
      .then(resolve, reject);
  });
}

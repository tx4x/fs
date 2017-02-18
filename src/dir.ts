import * as pathUtil from 'path';
import { Stats, stat, statSync, chmod, chmodSync, readdirSync, readdir } from 'fs';
import * as rimraf from 'rimraf';
import { normalizeFileMode as modeUtil } from './utils/mode';
import { validateArgument, validateOptions } from './utils/validate';
const Q = require('q');
const mkdirp = require('mkdirp');

export let validateInput = function (methodName: string, path: string, criteria?: any) {
  let methodSignature = methodName + '(path, [criteria])';
  validateArgument(methodSignature, 'path', path, ['string']);
  validateOptions(methodSignature, 'criteria', criteria, {
    empty: ['boolean'],
    mode: ['string', 'number']
  });
};

function getCriteriaDefaults(passedCriteria?: any) {
  const criteria = passedCriteria || {};
  if (typeof criteria.empty !== 'boolean') {
    criteria.empty = false;
  }
  if (criteria.mode !== undefined) {
    criteria.mode = modeUtil(criteria.mode);
  }
  return criteria;
};

function generatePathOccupiedByNotDirectoryError(path: string): Error {
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
    throw generatePathOccupiedByNotDirectoryError(path);
  }

  return stat;
};

function createBrandNewDirectorySync(path: string, criteria: any) {
  mkdirp.sync(path, { mode: criteria.mode });
};

function checkExistingDirectoryFulfillsCriteriaSync(path: string, stat: Stats, criteria: any) {
  const checkMode = function () {
    const mode = modeUtil(stat.mode);
    if (criteria.mode !== undefined && criteria.mode !== mode) {
      chmodSync(path, criteria.mode);
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

export function sync(path, passedCriteria) {
  let criteria = getCriteriaDefaults(passedCriteria);
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
          reject(generatePathOccupiedByNotDirectoryError(path));
        }
      })
      .catch(function (err) {
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
        const doOne = function (index) {
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
const checkMode = function (criteria, stat, path) {
  const mode = modeUtil(stat.mode);
  if (criteria.mode !== undefined && criteria.mode !== mode) {
    return promisedChmod(path, criteria.mode);
  }
  return Promise.resolve(null);
};

function checkExistingDirectoryFulfillsCriteriaAsync(path: string, stat: Stats, criteria: any) {
  return new Promise((resolve, reject) => {
    const checkEmptiness = function () {
      if (criteria.empty) {
        return emptyAsync(path);
      }
      return Promise.resolve();
    };
    checkMode(criteria, stat, path)
      .then(checkEmptiness)
      .then(resolve, reject);
  });
};

function createBrandNewDirectoryAsync(path: string, criteria: any): Promise<null> {
  return promisedMkdirp(path, { mode: criteria.mode });
};

export function async(path: string, passedCriteria?: any) {
  const criteria = getCriteriaDefaults(passedCriteria);
  return new Promise((resolve, reject) => {
    checkWhatAlreadyOccupiesPathAsync(path)
      .then(function (stat: Stats) {
        if (stat !== undefined) {
          return checkExistingDirectoryFulfillsCriteriaAsync(path, stat, criteria);
        }
        return createBrandNewDirectoryAsync(path, criteria);
      })
      .then(resolve, reject);
  });
}
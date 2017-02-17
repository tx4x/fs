import * as pathUtil from 'path';
import { Stats, stat, statSync, chmod, chmodSync, readdirSync, readdir } from 'fs';
const Q = require('q');
import { sync as mkdirp } from 'mkdirp';
import * as rimraf from 'rimraf';
import { normalizeFileMode as modeUtil } from './utils/mode';
import { argument, options } from './utils/validate';
export function validateInput(methodName: string, path: string, criteria: any) {
  const methodSignature = methodName + '(path, [criteria])';
  argument(methodSignature, 'path', path, ['string']);
  options(methodSignature, 'criteria', criteria, {
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

function checkWhatAlreadyOccupiesPathSync(path: string):Stats {
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
  var criteria = getCriteriaDefaults(passedCriteria);
  var stat = checkWhatAlreadyOccupiesPathSync(path);
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

function checkWhatAlreadyOccupiesPathAsync(path: string) {
  var deferred = Q.defer();
  promisedStat(path)
    .then(function (stat: any) {
      if (stat.isDirectory()) {
        deferred.resolve(stat);
      } else {
        deferred.reject(generatePathOccupiedByNotDirectoryError(path));
      }
    })
    .catch(function (err) {
      if (err.code === 'ENOENT') {
        // Path doesn't exist
        deferred.resolve(undefined);
      } else {
        // This is other error that nonexistent path, so end here.
        deferred.reject(err);
      }
    });

  return deferred.promise;
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

function checkExistingDirectoryFulfillsCriteriaAsync(path: string, stat: Stats, criteria: any) {
  return new Promise((resolve, reject) => {
    const checkMode = function () {
      const mode = modeUtil(stat.mode);
      if (criteria.mode !== undefined && criteria.mode !== mode) {
        return promisedChmod(path, criteria.mode);
      }
      return new Q();
    };
    const checkEmptiness = function () {
      if (criteria.empty) {
        return emptyAsync(path);
      }
      return new Q();
    };
    checkMode()
      .then(checkEmptiness)
      .then(resolve, reject);
  });
};

function createBrandNewDirectoryAsync(path: string, criteria: any) {
  return promisedMkdirp(path, { mode: criteria.mode });
};

export function async(path: string, passedCriteria) {
  return new Promise((resolve, reject) => {
    const criteria = getCriteriaDefaults(passedCriteria);
    checkWhatAlreadyOccupiesPathAsync(path)
      .then(stat => {
        if (stat !== undefined) {
          return checkExistingDirectoryFulfillsCriteriaAsync(path, stat, criteria);
        }
        return createBrandNewDirectoryAsync(path, criteria);
      })
      .then(resolve, reject);

  });
};

// ---------------------------------------------------------
// API
// ---------------------------------------------------------

module.exports.validateInput = validateInput;
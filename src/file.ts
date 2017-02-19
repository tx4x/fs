import * as fs from 'fs';
import { Stats } from 'fs';
import * as Q from 'q';
import { normalizeFileMode } from './utils/mode';
import { validateArgument, validateOptions } from './utils/validate';
import { sync as writeSync, async as writeASync } from './write';

export interface Options {
  content: string | Buffer | Object | Array<any>;
  jsonIndent: number;
  mode: string;
}

export function validateInput(methodName: string, path, criteria?: Options) {
  const methodSignature = methodName + '(path, [criteria])';
  validateArgument(methodSignature, 'path', path, ['string']);
  validateOptions(methodSignature, 'criteria', criteria, {
    content: ['string', 'buffer', 'object', 'array'],
    jsonIndent: ['number'],
    mode: ['string', 'number']
  });
};

function getCriteriaDefaults(passedCriteria: Options | null): Options {
  const criteria: any = passedCriteria || {};
  if (criteria.mode !== undefined) {
    criteria.mode = normalizeFileMode(criteria.mode);
  }
  return criteria;
};

function generatePathOccupiedByNotFileError(path: string): Error {
  return new Error('Path ' + path + ' exists but is not a file.' +
    ' Halting jetpack.file() call for safety reasons.');
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

function checkWhatAlreadyOccupiesPathSync(path: string) {
  let stat: Stats;
  try {
    stat = fs.statSync(path);
  } catch (err) {
    // Detection if path exists
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }

  if (stat && !stat.isFile()) {
    throw generatePathOccupiedByNotFileError(path);
  }

  return stat;
};

function checkExistingFileFulfillsCriteriaSync(path: string, stat: Stats, criteria?: Options) {
  const mode = normalizeFileMode(stat.mode);
  const checkContent = function (): boolean {
    if (criteria.content !== undefined) {
      writeSync(path, criteria.content, {
        mode: mode,
        jsonIndent: criteria.jsonIndent
      });
      return true;
    }
    return false;
  };

  const checkMode = function () {
    if (criteria.mode !== undefined && criteria.mode !== mode) {
      fs.chmodSync(path, criteria.mode as string);
    }
  };

  const contentReplaced = checkContent();
  if (!contentReplaced) {
    checkMode();
  }
};

function createBrandNewFileSync(path: string, criteria: Options) {
  let content: string | Buffer | Object | Array<any> = '';
  if (criteria.content !== undefined) {
    content = criteria.content;
  }
  writeSync(path, content, {
    mode: criteria.mode,
    jsonIndent: criteria.jsonIndent
  });
};

export function sync(path: string, passedCriteria: Options) {
  const criteria = getCriteriaDefaults(passedCriteria);
  const stat: Stats = checkWhatAlreadyOccupiesPathSync(path);
  if (stat !== undefined) {
    checkExistingFileFulfillsCriteriaSync(path, stat, criteria);
  } else {
    createBrandNewFileSync(path, criteria);
  }
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

const promisedStat = Q.denodeify(fs.stat);
const promisedChmod = Q.denodeify(fs.chmod);

function checkWhatAlreadyOccupiesPathAsync(path: string) {
  return new Promise((resolve, reject) => {
    promisedStat(path)
      .then(stat => {
        if ((stat as Stats).isFile()) {
          resolve(stat);
        } else {
          reject(generatePathOccupiedByNotFileError(path));
        }
      })
      .catch(err => {
        if (err.code === 'ENOENT') {
          // Path doesn't exist.
          resolve(undefined);
        } else {
          // This is other error. Must end here.
          reject(err);
        }
      });
  });
};

function checkExistingFileFulfillsCriteriaAsync(path: string, stat: Stats, criteria: Options) {
  const mode = normalizeFileMode(stat.mode);
  const checkContent = () => {
    return new Promise((resolve, reject) => {
      if (criteria.content !== undefined) {
        writeASync(path, criteria.content, {
          mode: mode,
          jsonIndent: criteria.jsonIndent
        })
          .then(() => resolve(true))
          .catch(reject);
      } else {
        resolve(false);
      }
    });
  };

  const checkMode = function () {
    if (criteria.mode !== undefined && criteria.mode !== mode) {
      return promisedChmod(path, criteria.mode);
    }
    return undefined;
  };

  return checkContent()
    .then(contentReplaced => {
      if (!contentReplaced) {
        return checkMode();
      }
      return undefined;
    });
};

function createBrandNewFileAsync(path, criteria) {
  let content: string = '';
  if (criteria.content !== undefined) {
    content = criteria.content;
  }

  return writeASync(path, content, {
    mode: criteria.mode,
    jsonIndent: criteria.jsonIndent
  });
};

export function async(path: string, passedCriteria) {
  return new Promise((resolve, reject) => {
    const criteria = getCriteriaDefaults(passedCriteria);
    checkWhatAlreadyOccupiesPathAsync(path)
      .then(stat => {
        if (stat !== undefined) {
          return checkExistingFileFulfillsCriteriaAsync(path, stat as Stats, criteria);
        }
        return createBrandNewFileAsync(path, criteria);
      })
      .then(resolve, reject);
  });
};
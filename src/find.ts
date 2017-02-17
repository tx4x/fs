'use strict';

import * as  pathUtil from "path";
import * as Q from 'q';
var treeWalker = require('./utils/tree_walker');
var inspect = require('./inspect');
var matcher = require('./utils/matcher');
var validate = require('./utils/validate');

export function validateInput(methodName: string, path: string, options: any) {
  var methodSignature = methodName + '([path], options)';
  validate.argument(methodSignature, 'path', path, ['string']);
  validate.options(methodSignature, 'options', options, {
    matching: ['string', 'array of string'],
    files: ['boolean'],
    directories: ['boolean'],
    recursive: ['boolean']
  });
};

function normalizeOptions(options?: any) {
  var opts = options || {};
  // defaults:
  if (opts.files === undefined) {
    opts.files = true;
  }
  if (opts.directories === undefined) {
    opts.directories = false;
  }
  if (opts.recursive === undefined) {
    opts.recursive = true;
  }
  return opts;
};

function processFoundObjects(foundObjects: any, cwd: string) {
  return foundObjects.map(inspectObj => {
    return pathUtil.relative(cwd, inspectObj.absolutePath);
  });
};

function generatePathDoesntExistError(path: string) {
  const err = new Error("Path you want to find stuff in doesn't exist " + path);
  err['code'] = 'ENOENT';
  return err;
};

function generatePathNotDirectoryError(path: string) {
  const err = new Error('Path you want to find stuff in must be a directory ' + path);
  err['code'] = 'ENOTDIR';
  return err;
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

function findSync(path: string, options: any) {
  const foundInspectObjects = [];
  const matchesAnyOfGlobs = matcher.create(path, options.matching);
  treeWalker.sync(path, {
    maxLevelsDeep: options.recursive ? Infinity : 1,
    inspectOptions: {
      absolutePath: true
    }
  }, (itemPath, item) => {
    if (itemPath !== path && matchesAnyOfGlobs(itemPath)) {
      if ((item.type === 'file' && options.files === true)
        || (item.type === 'dir' && options.directories === true)) {
        foundInspectObjects.push(item);
      }
    }
  });
  return processFoundObjects(foundInspectObjects, options.cwd);
};

function sync(path: string, options: any) {
  const entryPointInspect = inspect.sync(path);
  if (entryPointInspect === undefined) {
    throw generatePathDoesntExistError(path);
  } else if (entryPointInspect.type !== 'dir') {
    throw generatePathNotDirectoryError(path);
  }

  return findSync(path, normalizeOptions(options));
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

function findAsync(path: string, options: any) {
  return new Promise((resolve, reject) => {
    const foundInspectObjects = [];
    const matchesAnyOfGlobs = matcher.create(path, options.matching);
    const walker = treeWalker.stream(path, {
      maxLevelsDeep: options.recursive ? Infinity : 1,
      inspectOptions: {
        absolutePath: true
      }
    }).on('readable', () => {
      const data = walker.read();
      let item: any;
      if (data && data.path !== path && matchesAnyOfGlobs(data.path)) {
        item = data.item;
        if ((item.type === 'file' && options.files === true)
          || (item.type === 'dir' && options.directories === true)) {
          foundInspectObjects.push(item);
        }
      }
    }).on('error', reject)
      .on('end', () => {
        resolve(processFoundObjects(foundInspectObjects, options.cwd));
      });
  });
};

export function async(path: string, options: any) {
  return inspect.async(path)
    .then(function (entryPointInspect) {
      if (entryPointInspect === undefined) {
        throw generatePathDoesntExistError(path);
      } else if (entryPointInspect.type !== 'dir') {
        throw generatePathNotDirectoryError(path);
      }
      return findAsync(path, normalizeOptions(options));
    });
};

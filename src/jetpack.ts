import * as util from 'util';
import * as  pathUtil from "path";
import * as Q from 'q';
import * as append from './append';
import * as dir from './dir';
import { Options as DirOptions } from './dir';
import * as file from './file';
import * as find from './find';
import * as inspect from './inspect';
import * as inspectTree from './inspect_tree';
import * as copy from './copy';
import { Options as CopyOptions } from './copy';
import * as exists from './exists';
import * as list from './list';
import * as move from './move';
import * as remove from './remove';
import * as rename from './rename';
import * as symlink from './symlink';
import * as streams from './streams';
import * as write from './write';
import * as read from './read';

// The Jetpack Context object.
// It provides the public API, and resolves all paths regarding to
// passed cwdPath, or default process.cwd() if cwdPath was not specified.
function jetpackContext(cwdPath?: string) {
  let getCwdPath = function () {
    return cwdPath || process.cwd();
  };

  let cwd = function (w?: any) {
    let args;
    let pathParts;

    // return current CWD if no arguments specified...
    if (arguments.length === 0) {
      return getCwdPath();
    }

    // ...create new CWD context otherwise
    args = Array.prototype.slice.call(arguments);
    pathParts = [getCwdPath()].concat(args);

    const res = jetpackContext(pathUtil.resolve.apply(null, pathParts));
    return res;
  };

  // resolves path to inner CWD path of this jetpack instance
  let resolvePath = function (path) {
    return pathUtil.resolve(getCwdPath(), path);
  };

  let getPath = function () {
    // add CWD base path as first element of arguments array
    Array.prototype.unshift.call(arguments, getCwdPath());
    return pathUtil.resolve.apply(null, arguments);
  };

  let normalizeOptions = function (options) {
    let opts = options || {};
    opts.cwd = getCwdPath();
    return opts;
  };

  // API

  let api = {
    cwd: cwd,
    path: getPath,

    append: function (path, data, options) {
      append.validateInput('append', path, data, options);
      append.sync(resolvePath(path), data, options);
    },
    appendAsync: function (path, data, options) {
      append.validateInput('appendAsync', path, data, options);
      return append.async(resolvePath(path), data, options);
    },

    copy: function (from: string, to: string, options?: CopyOptions) {
      copy.validateInput('copy', from, to, options);
      copy.sync(resolvePath(from), resolvePath(to), options);
    },
    copyAsync: function (from: string, to: string, options?: CopyOptions) {
      copy.validateInput('async', from, to, options);
      return copy.async(resolvePath(from), resolvePath(to), options);
    },

    createWriteStream: function (path, options) {
      return streams.createWriteStream(resolvePath(path), options);
    },
    createReadStream: function (path, options) {
      return streams.createReadStream(resolvePath(path), options);
    },

    dir: function (path, criteria?:DirOptions) {
      let normalizedPath;
      dir.validateInput('sync', path, criteria);
      normalizedPath = resolvePath(path);
      dir.sync(normalizedPath, criteria);
      return cwd(normalizedPath);
    },
    dirAsync: function (path: string, criteria?: DirOptions) {
      const deferred = Q.defer();
      let normalizedPath: string;
      dir.validateInput('async', path, criteria);
      normalizedPath = resolvePath(path);
      dir.async(normalizedPath, criteria)
        .then(function () {
          deferred.resolve(cwd(normalizedPath));
        }, deferred.reject);
      return deferred.promise;
    },

    exists: function (path) {
      exists.validateInput('exists', path);
      return exists.sync(resolvePath(path));
    },
    existsAsync: function (path) {
      exists.validateInput('existsAsync', path);
      return exists.async(resolvePath(path));
    },

    file: function (path, criteria) {
      file.validateInput('file', path, criteria);
      file.sync(resolvePath(path), criteria);
      return this;
    },
    fileAsync: function (path, criteria) {
      let deferred = Q.defer();
      let that = this;
      file.validateInput('fileAsync', path, criteria);
      file.async(resolvePath(path), criteria)
        .then(function () {
          deferred.resolve(that);
        }, deferred.reject);
      return deferred.promise;
    },

    find: function (startPath, options) {
      // startPath is optional parameter, if not specified move rest of params
      // to proper places and default startPath to CWD.
      if (typeof options === 'undefined' && typeof startPath === 'object') {
        options = startPath;
        startPath = '.';
      }
      find.validateInput('find', startPath, options);
      return find.sync(resolvePath(startPath), normalizeOptions(options));
    },
    findAsync: function (startPath, options) {
      // startPath is optional parameter, if not specified move rest of params
      // to proper places and default startPath to CWD.
      if (typeof options === 'undefined' && typeof startPath === 'object') {
        options = startPath;
        startPath = '.';
      }
      find.validateInput('findAsync', startPath, options);
      return find.async(resolvePath(startPath), normalizeOptions(options));
    },

    inspect: function (path, fieldsToInclude) {
      inspect.validateInput('inspect', path, fieldsToInclude);
      return inspect.sync(resolvePath(path), fieldsToInclude);
    },
    inspectAsync: function (path, fieldsToInclude) {
      inspect.validateInput('inspectAsync', path, fieldsToInclude);
      return inspect.async(resolvePath(path), fieldsToInclude);
    },

    inspectTree: function (path, options) {
      inspectTree.validateInput('inspectTree', path, options);
      return inspectTree.sync(resolvePath(path), options);
    },
    inspectTreeAsync: function (path, options) {
      inspectTree.validateInput('inspectTreeAsync', path, options);
      return inspectTree.async(resolvePath(path), options);
    },

    list: function (path) {
      list.validateInput('list', path);
      return list.sync(resolvePath(path || '.'));
    },
    listAsync: function (path) {
      list.validateInput('listAsync', path);
      return list.async(resolvePath(path || '.'));
    },

    move: function (from, to) {
      move.validateInput('move', from, to);
      move.sync(resolvePath(from), resolvePath(to));
    },
    moveAsync: function (from, to) {
      move.validateInput('moveAsync', from, to);
      return move.async(resolvePath(from), resolvePath(to));
    },

    read: function (path, returnAs) {
      read.validateInput('read', path, returnAs);
      return read.sync(resolvePath(path), returnAs);
    },
    readAsync: function (path, returnAs) {
      read.validateInput('readAsync', path, returnAs);
      return read.async(resolvePath(path), returnAs);
    },

    remove: function (path) {
      remove.validateInput('remove', path);
      // If path not specified defaults to CWD
      remove.sync(resolvePath(path || '.'));
    },
    removeAsync: function (path) {
      remove.validateInput('removeAsync', path);
      // If path not specified defaults to CWD
      return remove.async(resolvePath(path || '.'));
    },

    rename: function (path, newName) {
      rename.validateInput('rename', path, newName);
      rename.sync(resolvePath(path), newName);
    },
    renameAsync: function (path, newName) {
      rename.validateInput('renameAsync', path, newName);
      return rename.async(resolvePath(path), newName);
    },

    symlink: function (symlinkValue, path) {
      symlink.validateInput('symlink', symlinkValue, path);
      symlink.sync(symlinkValue, resolvePath(path));
    },
    symlinkAsync: function (symlinkValue, path) {
      symlink.validateInput('symlinkAsync', symlinkValue, path);
      return symlink.async(symlinkValue, resolvePath(path));
    },

    write: function (path, data, options) {
      write.validateInput('write', path, data, options);
      write.sync(resolvePath(path), data, options);
    },
    writeAsync: function (path, data, options) {
      write.validateInput('writeAsync', path, data, options);
      return write.async(resolvePath(path), data, options);
    }
  };


  if (util.inspect['custom'] !== undefined) {
    // Without this console.log(jetpack) throws obscure error. Details:
    // https://github.com/szwacz/fs-jetpack/issues/29
    // https://nodejs.org/api/util.html#util_custom_inspection_functions_on_objects
    api[util.inspect['custom']] = function () {
      return getCwdPath();
    };
  }

  return api;
};

module.exports = jetpackContext;

/*
var fse = require('fs-extra');
fse.outputFileSync('file.txt', 'abc');
const jetpack = jetpackContext();
var crypto = require('crypto');
var os = require('os');
var random = crypto.randomBytes(16).toString('hex');
var path = os.tmpdir() + '/fs-jetpack-test-' + random + '/ab/';
*/
//fse.mkdirsSync('dir');

/*
import { sync as treeWalkerSync, stream as treeWalkerStream } from './utils/tree_walker';
var stream = treeWalkerStream('file.txt', {
  inspectOptions: {
    mode: true,
    symlinks: true
  }
})
  .on('readable', function () {
    console.log('r',arguments);
  });
*/
/*
process.on('unhandledRejection', (reason) => {
  
});
*/



//Argument "path" passed to dirAsync(path, [criteria]) must be a string. Received undefined
//Argument "path" passed to async(path, [criteria]) must be a string. Received undefined' but got 'Argument "path"
//assed to dirAsync(path, [criteria]) must be a string. Received undefined'

//dir.validateInput('async', undefined);


/*
console.error('create path : ',path);
jetpack.dirAsync(path).then(function (d) {  
  console.log('hgo');
    
  console.log('a', jetpack.cwd());
  console.error('a ' + jetpack.cwd() === d);
  
}, function (e) {
  console.log('err', e);
})
*/



//console.log(jetpack.path());
/*
jetpack.copyAsync('dir', 'copied/dir', {}).then(function () {
  console.log('done!', arguments);
}, function (e) {
  console.error('e:', e);
});
*/

/*
import { sync as treeWalkerSync, stream as treeWalkerStream } from './utils/tree_walker';
import { sync as inspectSync, async as inspectASync } from './inspect';
const _p = jetpack.path();
inspectASync(_p, {
  mode: true,
  symlinks: true
}).then(function (inspected) {
  console.log('ins');
});
*/

/*
const st = treeWalkerStream(jetpack.path(), {
  inspectOptions: {
    mode: true,
    symlinks: true
  }
}).on('readable', function () {
  let a = st.read();
  console.log(arguments);
});
*/

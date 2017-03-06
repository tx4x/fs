"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jetpack_1 = require("./jetpack");
const validate_1 = require("./utils/validate");
const interfaces_1 = require("./interfaces");
function testBig() {
    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled rejection, reason: ', reason);
    });
    jetpack_1.jetpack().copy('/mnt/anne/backups/eclipsew.tar', '/tmp/eclipsew.tar2', {
        overwrite: true,
        progress: (path, current, total, item) => {
            //console.log('copieing : ' + path + ' ' + item.size);
            console.log('copy item ' + current + ' from ' + total);
            return true;
        },
        writeProgress: (path, current, total) => {
            //console.log('copieing : ' + path + ' ' + item.size);
            console.log('write ' + current + ' from ' + total);
        }
    });
}
exports.testBig = testBig;
function testCollisionDirectory() {
    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled rejection, reason: ', reason);
    });
    const jp = jetpack_1.jetpack('./');
    jp.copyAsync('./src/', './srcout', {
        matching: ['**/*.ts'],
        overwrite: false,
        conflictCallback: (path, item, err) => {
            if (path.indexOf('write.ts') !== -1) {
                if (err === 'EACCES') {
                    return Promise.resolve({ overwrite: interfaces_1.EResolveMode.SKIP, mode: interfaces_1.EResolve.THIS });
                }
                if (err === 'ENOENT') {
                    return Promise.resolve({ overwrite: interfaces_1.EResolveMode.THROW, mode: interfaces_1.EResolve.THIS });
                }
            }
            return Promise.resolve({ overwrite: interfaces_1.EResolveMode.OVERWRITE, mode: interfaces_1.EResolve.THIS });
        },
        progress: (path, current, total, item) => {
            //console.log('copieing : ' + path + ' ' + item.size);
            console.log('copy item ' + current + ' from ' + total);
            return true;
        }
        /*_writeProgress: (path: string, current: number, total: number) => {
          //console.log('copieing : ' + path + ' ' + item.size);
          console.log('write ' + current + ' from ' + total);
        }*/
    }).then(() => {
        console.log('done');
    }).catch(e => {
        console.error('error ', e);
    });
}
exports.testCollisionDirectory = testCollisionDirectory;
function testCollisionFile() {
    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled rejection, reason: ', reason);
    });
    const jp = jetpack_1.jetpack('./');
    jp.copyAsync('./src/dir.ts', './srcout/dir.ts', {
        overwrite: false,
        conflictCallback: (path, item) => {
            return Promise.resolve({ overwrite: interfaces_1.EResolveMode.OVERWRITE, mode: interfaces_1.EResolve.THIS });
        },
        progress: (path, current, total, item) => {
            //console.log('copieing : ' + path + ' ' + item.size);
            console.log('copy item ' + current + ' from ' + total);
            return true;
        }
        /*_writeProgress: (path: string, current: number, total: number) => {
          //console.log('copieing : ' + path + ' ' + item.size);
          console.log('write ' + current + ' from ' + total);
        }*/
    }).then(() => {
        console.log('done');
    }).catch(e => {
        console.error('error ', e);
    });
}
exports.testCollisionFile = testCollisionFile;
function testCopySymlink() {
    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled rejection, reason: ', reason);
    });
    const jp = jetpack_1.jetpack('./');
    /*
      lstat('to_copy/symlink',function(err,stat){
        console.log('err',err);
        console.log('stat',stat);
      });
      if (jp) {
        return;
      }
      */
    jp.copyAsync('./to_copy', './copied', {
        overwrite: true
        /*
        conflictCallback: (path: string, item: INode) => {
          return Promise.resolve({ overwrite: EResolveMode.OVERWRITE, mode: EResolve.THIS });
        },
        progress: (path: string, current: number, total: number, item: INode) => {
          //console.log('copieing : ' + path + ' ' + item.size);
          console.log('copy item ' + current + ' from ' + total);
        }
        */
        /*_writeProgress: (path: string, current: number, total: number) => {
          //console.log('copieing : ' + path + ' ' + item.size);
          console.log('write ' + current + ' from ' + total);
        }*/
    }).then(() => {
        console.log('done');
    }).catch(e => {
        console.error('error ', e);
    });
}
exports.testCopySymlink = testCopySymlink;
function prepareSymlink() {
    var fse = require('fs-extra');
    try {
        fse.mkdirsSync('./to_copy');
    }
    catch (e) { }
    try {
        fse.symlinkSync('../packag.json', 'to_copy/symlink');
    }
    catch (e) { }
}
exports.prepareSymlink = prepareSymlink;
function inspectTreeTest() {
    var fse = require('fs-extra');
    try {
        fse.outputFileSync('./dir/a.txt', 'abc');
    }
    catch (e) { }
    try {
        fse.outputFileSync('./dir/b.txt', 'defg');
    }
    catch (e) { }
    const jp = jetpack_1.jetpack('./');
    console.log(jp.inspectTree('dir'));
}
exports.inspectTreeTest = inspectTreeTest;
function validateTest() {
    validate_1.validateArgument('foo(thing)', 'thing', 123, ['foo']);
}
exports.validateTest = validateTest;
//# sourceMappingURL=playground.js.map
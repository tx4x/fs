"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const jetpack_1 = require("./jetpack");
const validate_1 = require("./utils/validate");
const interfaces_1 = require("./interfaces");
function testBig() {
    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled rejection, reason: ', reason);
    });
    jetpack_1.jetpack().copyAsync('/mnt/anne/backups/eclipsew.tar', '/tmp/eclipsew.tar2', {
        matching: ['/mnt/anne/backups/eclipsew.tar2'],
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
    }).then(function () {
        console.log('done!');
    });
}
exports.testBig = testBig;
function testManyWithProgress() {
    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled rejection, reason: ', reason);
    });
    jetpack_1.jetpack().remove('/tmp/fs_jetpack2');
    jetpack_1.jetpack().copyAsync('./src', '/tmp/fs_jetpack2', {
        overwrite: true,
        progress: (path, current, total, item) => {
            if (path.indexOf('.exe') !== -1) {
                console.log('copieing : ' + path + ' ' + item.size);
            }
            //console.log('copy item ' + current + ' from ' + total);
            return true;
        },
        writeProgress: (path, current, total) => {
            //console.log('copieing : ' + path + ' ' + item.size);
            console.log('write ' + path + " : " + current + ' from ' + total);
        }
    }).then(function () {
        console.log('done');
    });
}
exports.testManyWithProgress = testManyWithProgress;
function conflict(path, item, err) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('conflict');
        return new Promise((resolve, reject) => {
            setTimeout(function () {
                resolve({ overwrite: interfaces_1.EResolveMode.OVERWRITE, mode: interfaces_1.EResolve.THIS });
            }, 500);
        });
    });
}
;
function testCollisionDirectory() {
    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled rejection, reason: ', reason);
    });
    const jp = jetpack_1.jetpack('./');
    jetpack_1.jetpack().dir('./srcout');
    let start = 500;
    jp.copyAsync('./src/fs/utils/', './srcout', {
        matching: ['**/*.ts'],
        overwrite: false,
        debug: false,
        //flags: ECopyFlags.EMPTY,
        conflictCallback: (path, item, err) => {
            //console.log('conflict ' + path);
            if (path.indexOf('write.ts') !== -1) {
                let abort = false;
                if (abort) {
                    //console.log('abort !',new Error().stack);
                    return new Promise((resolve, reject) => {
                        setTimeout(function () {
                            resolve({ overwrite: interfaces_1.EResolveMode.SKIP, mode: interfaces_1.EResolve.THIS });
                        }, 5000);
                    });
                }
                if (err === 'EACCES') {
                    return Promise.resolve({ overwrite: interfaces_1.EResolveMode.SKIP, mode: interfaces_1.EResolve.THIS });
                }
                if (err === 'ENOENT') {
                    return Promise.resolve({ overwrite: interfaces_1.EResolveMode.THROW, mode: interfaces_1.EResolve.THIS });
                }
            }
            //return Promise.resolve({ overwrite: EResolveMode.OVERWRITE, mode: EResolve.THIS });
            //start += 100;
            return new Promise((resolve, reject) => {
                setTimeout(function () {
                    resolve({ overwrite: interfaces_1.EResolveMode.OVERWRITE, mode: interfaces_1.EResolve.THIS });
                }, start);
            });
        },
        progress: (path, current, total, item) => {
            //console.log('copieing : ' + path + ' ' + item.size);
            //console.log('copy item ' + current + ' from ' + total);
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
//testCollisionDirectory();
//# sourceMappingURL=playground.js.map
"use strict";
const jetpack_1 = require("./jetpack");
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
        conflictCallback: (path, item) => {
            if (~path.indexOf('remove.ts')) {
                return Promise.resolve({ overwrite: interfaces_1.EResolveMode.ABORT, mode: interfaces_1.EResolve.THIS });
            }
            return Promise.resolve({ overwrite: interfaces_1.EResolveMode.OVERWRITE, mode: interfaces_1.EResolve.THIS });
        },
        progress: (path, current, total, item) => {
            //console.log('copieing : ' + path + ' ' + item.size);
            console.log('copy item ' + current + ' from ' + total);
        }
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
        }
    }).then(() => {
        console.log('done');
    }).catch(e => {
        console.error('error ', e);
    });
}
exports.testCollisionFile = testCollisionFile;
//# sourceMappingURL=playground.js.map
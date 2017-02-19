"use strict";
const jetpack_1 = require("./jetpack");
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
//console.log(b.inspectTree(b.path()));
//# sourceMappingURL=playground.js.map
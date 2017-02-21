import { IJetpack, jetpack } from './jetpack';
import { IInspectOptions as InspectOptions, IInspectItem, ECopyResolveMode } from './interfaces';
export function testBig() {
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection, reason: ', reason);
  });
  jetpack().copy('/mnt/anne/backups/eclipsew.tar', '/tmp/eclipsew.tar2', {
    overwrite: true,
    progress: (path: string, current: number, total: number, item: IInspectItem) => {
      //console.log('copieing : ' + path + ' ' + item.size);
      console.log('copy item ' + current + ' from ' + total);
    },
    writeProgress: (path: string, current: number, total: number) => {
      //console.log('copieing : ' + path + ' ' + item.size);
      console.log('write ' + current + ' from ' + total);
    }
  });
}

export function testCollision() {

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection, reason: ', reason);
  });
  const jp = jetpack('./');
  jp.copyAsync('./src/', './srcout', {
    matching: ['**/*.ts'],
    overwrite: false,
    conflictCallback: (path: string, item: IInspectItem) => {
      return Promise.resolve(ECopyResolveMode.IF_SIZE_DIFFERS);
    },
    progress: (path: string, current: number, total: number, item: IInspectItem) => {
      //console.log('copieing : ' + path + ' ' + item.size);
      console.log('copy item ' + current + ' from ' + total);
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

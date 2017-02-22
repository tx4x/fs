import { IJetpack, jetpack } from './jetpack';
import { IInspectOptions as InspectOptions, INode, EResolveMode, EResolve } from './interfaces';
export function testBig() {
  process.on('unhandledRejection', (reason:string) => {
    console.error('Unhandled rejection, reason: ', reason);
  });
  jetpack().copy('/mnt/anne/backups/eclipsew.tar', '/tmp/eclipsew.tar2', {
    overwrite: true,
    progress: (path: string, current: number, total: number, item: INode) => {
      //console.log('copieing : ' + path + ' ' + item.size);
      console.log('copy item ' + current + ' from ' + total);
    },
    writeProgress: (path: string, current: number, total: number) => {
      //console.log('copieing : ' + path + ' ' + item.size);
      console.log('write ' + current + ' from ' + total);
    }
  });
}

export function testCollisionDirectory() {
  process.on('unhandledRejection', (reason: string) => {
    console.error('Unhandled rejection, reason: ', reason);
  });
  const jp = jetpack('./');
  jp.copyAsync('./src/', './srcout', {
    matching: ['**/*.ts'],
    overwrite: false,
    conflictCallback: (path: string, item: INode) => {
      if (~path.indexOf('remove.ts')) {
        return Promise.resolve({ overwrite: EResolveMode.ABORT, mode: EResolve.THIS });
      }
      return Promise.resolve({ overwrite: EResolveMode.OVERWRITE, mode: EResolve.THIS });
    },
    progress: (path: string, current: number, total: number, item: INode) => {
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

export function testCollisionFile() {

  process.on('unhandledRejection', (reason:string) => {
    console.error('Unhandled rejection, reason: ', reason);
  });
  const jp = jetpack('./');
  jp.copyAsync('./src/dir.ts', './srcout/dir.ts', {
    overwrite: false,
    conflictCallback: (path: string, item: INode) => {
      return Promise.resolve({ overwrite: EResolveMode.OVERWRITE, mode: EResolve.THIS });
    },
    progress: (path: string, current: number, total: number, item: INode) => {
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

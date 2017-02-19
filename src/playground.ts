import {IJetpack,jetpack} from './jetpack';
import { InspectOptions as InspectOptions, IInspectItem } from './inspect';

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


//console.log(b.inspectTree(b.path()));




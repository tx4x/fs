import { IJetpack, jetpack } from './jetpack';
import { validateArgument } from './utils/validate';
import { IInspectOptions as InspectOptions, INode, EResolveMode, EResolve, EError, IConflictSettings, ECopyFlags } from './interfaces';
import { Stats, readlinkSync, statSync, lstatSync, stat, lstat, readlink, createReadStream, readFileSync } from 'fs';

export function testBig() {
	process.on('unhandledRejection', (reason: string) => {
		console.error('Unhandled rejection, reason: ', reason);
	});
	jetpack().copyAsync('/mnt/anne/backups/eclipsew.tar', '/tmp/eclipsew.tar2', {
		matching:['/mnt/anne/backups/eclipsew.tar2'],
		overwrite: true,
		progress: (path: string, current: number, total: number, item: INode) => {
			//console.log('copieing : ' + path + ' ' + item.size);
			console.log('copy item ' + current + ' from ' + total);
			return true;
		},
		writeProgress: (path: string, current: number, total: number) => {
			//console.log('copieing : ' + path + ' ' + item.size);
			console.log('write ' + current + ' from ' + total);
		}
	}).then(function () {
		console.log('done!');
	});
}
export function testManyWithProgress() {
	process.on('unhandledRejection', (reason: string) => {
		console.error('Unhandled rejection, reason: ', reason);
	});
	jetpack().remove('/tmp/fs_jetpack2');
	jetpack().copyAsync('./src', '/tmp/fs_jetpack2', {
		overwrite: true,

		progress: (path: string, current: number, total: number, item: INode) => {
			if (path.indexOf('.exe') !== -1) {
				console.log('copieing : ' + path + ' ' + item.size);
			}
			//console.log('copy item ' + current + ' from ' + total);
			return true;
		},
		writeProgress: (path: string, current: number, total: number) => {
			//console.log('copieing : ' + path + ' ' + item.size);
			console.log('write ' + path + " : " + current + ' from ' + total);
		}
	}).then(function () {
		console.log('done');
	});
}
async function conflict(path: string, item: INode, err: string) {
	console.log('conflict');
	return new Promise<IConflictSettings>((resolve, reject) => {
		setTimeout(function () {
			resolve({ overwrite: EResolveMode.OVERWRITE, mode: EResolve.THIS });
		}, 500);
	});
};

export function testCollisionDirectory() {
	process.on('unhandledRejection', (reason: string) => {
		console.error('Unhandled rejection, reason: ', reason);
	});
	const jp = jetpack('./');
	jetpack().dir('./srcout');
	let start = 500;
	jp.copyAsync('./src/fs/utils/', './srcout', {
		matching: ['**/*.ts'],
		overwrite: false,
		debug: false,
		//flags: ECopyFlags.EMPTY,
		conflictCallback: (path: string, item: INode, err: string) => {
			//console.log('conflict ' + path);
			if (path.indexOf('write.ts') !== -1) {
				let abort = false;
				if (abort) {
					//console.log('abort !',new Error().stack);
					return new Promise<IConflictSettings>((resolve, reject) => {
						setTimeout(function () {
							resolve({ overwrite: EResolveMode.SKIP, mode: EResolve.THIS });
						}, 5000);
					});
				}
				if (err === 'EACCES') {
					return Promise.resolve({ overwrite: EResolveMode.SKIP, mode: EResolve.THIS });
				}
				if (err === 'ENOENT') {
					return Promise.resolve({ overwrite: EResolveMode.THROW, mode: EResolve.THIS });
				}
			}
			//return Promise.resolve({ overwrite: EResolveMode.OVERWRITE, mode: EResolve.THIS });
			//start += 100;
			return new Promise<IConflictSettings>((resolve, reject) => {
				setTimeout(function () {
					resolve({ overwrite: EResolveMode.OVERWRITE, mode: EResolve.THIS });
				}, start);
			});
		},

		progress: (path: string, current: number, total: number, item: INode) => {
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

export function testCollisionFile() {

	process.on('unhandledRejection', (reason: string) => {
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




export function testCopySymlink() {

	process.on('unhandledRejection', (reason: string) => {
		console.error('Unhandled rejection, reason: ', reason);
	});
	const jp = jetpack('./');

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

export function prepareSymlink() {
	var fse = require('fs-extra');
	try {
		fse.mkdirsSync('./to_copy');
	} catch (e) { }
	try {
		fse.symlinkSync('../packag.json', 'to_copy/symlink');
	} catch (e) { }
}
export function inspectTreeTest() {
	var fse = require('fs-extra');

	try {
		fse.outputFileSync('./dir/a.txt', 'abc');
	} catch (e) { }
	try {
		fse.outputFileSync('./dir/b.txt', 'defg');
	} catch (e) { }
	const jp = jetpack('./');
	console.log(jp.inspectTree('dir'));
}
export function validateTest() {
	validateArgument('foo(thing)', 'thing', 123, ['foo']);
}

//testCollisionDirectory();

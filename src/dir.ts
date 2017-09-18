import * as pathUtil from 'path';
import { Stats, stat, statSync, readdirSync, readdir } from 'fs';
import { promisify } from 'util';
import * as fs from 'fs';
import { sync as removeSync, async as removeAsync } from './remove';
import { normalizeFileMode as modeUtil } from './utils/mode';
import { validateArgument, validateOptions } from './utils/validate';
import { ErrNoDirectory } from './errors';
import { EError } from './interfaces';
import * as  mkdirp from 'mkdirp';

export interface IOptions {
	empty?: boolean;
	mode?: number | string;
}

export const validateInput = (methodName: string, path: string, options?: IOptions) => {
	const methodSignature = methodName + '(path, [criteria])';
	validateArgument(methodSignature, 'path', path, ['string']);
	validateOptions(methodSignature, 'criteria', options, {
		empty: ['boolean'],
		mode: ['string', 'number']
	});
};

const defaults = (options?: IOptions): IOptions => {
	const result = options || {};
	if (typeof result.empty !== 'boolean') {
		result.empty = false;
	}
	if (result.mode !== undefined) {
		result.mode = modeUtil(result.mode);
	}
	return result;
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
const dirStatsSync = (path: string): Stats => {
	let stat: Stats;
	try {
		stat = statSync(path);
	} catch (err) {
		// Detection if path already exists
		if (err.code !== EError.NOEXISTS) {
			throw err;
		}
	}

	if (stat && !stat.isDirectory()) {
		throw ErrNoDirectory(path);
	}

	return stat;
};

function mkdirSync(path: string, criteria: IOptions) {
	mkdirp.sync(path, { mode: criteria.mode as number, fs: null });
};

function checkDirSync(path: string, stat: Stats, options: IOptions) {
	const checkMode = function () {
		if (options.mode !== undefined) {
			fs.chmodSync(path, options.mode);
		}
	};
	const checkEmptiness = function () {
		let list: string[];
		if (options.empty) {
			// Delete everything inside this directory
			list = readdirSync(path);
			list.forEach(function (filename) {
				removeSync(pathUtil.resolve(path, filename));
			});
		}
	};
	checkMode();
	checkEmptiness();
};

export const sync = (path: string, options?: IOptions) => {
	const criteria = defaults(options);
	const stat = dirStatsSync(path);
	if (stat) {
		checkDirSync(path, stat, criteria);
	} else {
		mkdirSync(path, criteria);
	}
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
const promisedStat = promisify(stat);
const promisedReaddir = promisify(readdir);
const dirStatAsync = (path: string): Promise<Stats> => {
	return new Promise<Stats>((resolve, reject) => {
		promisedStat(path)
			.then((stat: any) => {
				if (stat.isDirectory()) {
					resolve(stat);
				} else {
					reject(ErrNoDirectory(path));
				}
			})
			.catch((err: any) => (err.code === EError.NOEXISTS ? resolve(undefined) : reject(err)));

	});
};

// Delete all files and directores inside given directory
const emptyAsync = (path: string) => {
	return new Promise((resolve, reject) => {
		promisedReaddir(path)
			.then(function (list: any[]) {
				const doOne = function (index: number) {
					let subPath: string;
					if (index === list.length) {
						resolve();
					} else {
						subPath = pathUtil.resolve(path, list[index]);
						removeAsync(subPath).then(() => doOne(index + 1));
					}
				};
				doOne(0);
			})
			.catch(reject);
	});
};

const checkMode = function (criteria: IOptions, stat: Stats, path: string): Promise<any> {
	if (criteria.mode !== undefined) {
		return promisify(fs.chmod)(path, criteria.mode);
	}
	return Promise.resolve(null);
};

const checkDirAsync = (path: string, stat: Stats, options: IOptions) => {
	return new Promise((resolve, reject) => {
		const checkEmptiness = function (): Promise<any> {
			if (options.empty) {
				return emptyAsync(path);
			}
			return Promise.resolve();
		};
		checkMode(options, stat, path)
			.then(checkEmptiness)
			.then(resolve, reject);
	});
};

const mkdirAsync = (path: string, criteria: IOptions): Promise<any> => {
	const options = criteria || {};
	return new Promise((resolve, reject) => {
		promisify(fs.mkdir)(path, options.mode)
			.then(resolve)
			.catch((err) => {
				if (err.code === 'ENOENT') {
					// Parent directory doesn't exist. Need to create it first.
					mkdirAsync(pathUtil.dirname(path), options)
						.then(() => {
							// Now retry creating this directory.
							return promisify(fs.mkdir)(path, options.mode);
						})
						.then(resolve)
						.catch((err2) => {
							if (err2.code === 'EEXIST') {
								// Hmm, something other have already created the directory?
								// No problem for us.
								resolve();
							} else {
								reject(err2);
							}
						});
				} else if (err.code === 'EEXIST') {
					// The path already exists. We're fine.
					resolve();
				} else {
					reject(err);
				}
			});
	});
};

export const async = (path: string, passedCriteria?: IOptions) => {
	const criteria = defaults(passedCriteria);
	return new Promise((resolve, reject) => {
		dirStatAsync(path)
			.then((stat: Stats) => {
				if (stat !== undefined) {
					return checkDirAsync(path, stat, criteria);
				}
				return mkdirAsync(path, criteria);
			})
			.then(resolve, reject);
	});
};

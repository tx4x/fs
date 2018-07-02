import * as fs from 'fs';
import { Stats } from 'fs';
const Q = require('q');
import { normalizeFileMode } from './utils/mode';
import { validateArgument, validateOptions } from './utils/validate';
import { sync as writeSync, async as writeASync } from './write';
import { ErrNotFile } from './errors';
import { EError } from './interfaces';

const promisedStat = Q.denodeify(fs.stat);
const promisedChmod = Q.denodeify(fs.chmod);

export interface IOptions {
	content: string | Buffer | Object | Array<any>;
	jsonIndent: number;
	mode: string;
}

export function validateInput(methodName: string, path: string, options?: IOptions) {
	const methodSignature = methodName + '(path, [criteria])';
	validateArgument(methodSignature, 'path', path, ['string']);
	validateOptions(methodSignature, 'criteria', options, {
		content: ['string', 'buffer', 'object', 'array'],
		jsonIndent: ['number'],
		mode: ['string', 'number']
	});
}

export function defaults(passedCriteria: IOptions | null): IOptions {
	const criteria: any = passedCriteria || {};
	if (criteria.mode !== undefined) {
		criteria.mode = normalizeFileMode(criteria.mode);
	}
	return criteria;
}

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

const isFile = (path: string): Stats => {
	let stat: Stats;
	try {
		stat = fs.statSync(path);
	} catch (err) {
		// Detection if path exists
		if (err.code !== EError.NOEXISTS) {
			throw err;
		}
	}

	if (stat && !stat.isFile()) {
		throw ErrNotFile(path);
	}

	return stat;
};

const checkContent = function (path: string, mode: string, options: IOptions): boolean {
	if (options.content !== undefined) {
		writeSync(path, options.content, {
			mode: mode,
			jsonIndent: options.jsonIndent
		});
		return true;
	}
	return false;
};

const checkMode = function (path: string, mode: string, options: IOptions) {
	if (options.mode !== undefined && options.mode !== mode) {
		fs.chmodSync(path, options.mode);
	}
};

const accept = (path: string, stat: Stats, options?: IOptions): void => {
	const mode = normalizeFileMode(stat.mode);
	if (!checkContent(path, mode, options)) {
		checkMode(path, mode, options);
	}
};

const touch = (path: string, options: IOptions): void => {
	const content: string | Buffer | Object | Array<any> = options.content !== undefined ? options.content : '';
	writeSync(path, content, {
		mode: options.mode,
		jsonIndent: options.jsonIndent
	});
};

export function sync(path: string, options: IOptions) {
	options = defaults(options);
	const stat: Stats = isFile(path);
	if (stat !== undefined) {
		accept(path, stat, options);
	} else {
		touch(path, options);
	}
}

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

function isFileAsync(path: string): Promise<Stats> {
	return new Promise<Stats>((resolve, reject) => {
		promisedStat(path)
			.then((stat: Stats) => {
				if ((stat).isFile()) {
					resolve(stat);
				} else {
					reject(ErrNotFile(path));
				}
			})
			.catch((err: any) => (err.code === EError.NOEXISTS ? resolve(undefined) : reject(err)));
	});
}
const checkModeAsync = (path: string, mode: string, options: IOptions) => {
	if (options.mode !== undefined && options.mode !== mode) {
		return promisedChmod(path, options.mode);
	}
	return undefined;
};
const checkContentAsync = (path: string, mode: string, options: IOptions) => {
	return new Promise((resolve, reject) => {
		if (options.content !== undefined) {
			writeASync(path, options.content, {
				mode: mode,
				jsonIndent: options.jsonIndent
			}).then(() => resolve(true))
				.catch(reject);
		} else {
			resolve(false);
		}
	});
};
async function writeAsync(path: string, stat: Stats, options: IOptions): Promise<boolean> {
	const mode = normalizeFileMode(stat.mode);
	return checkContentAsync(path, mode, options)
		.then(contentReplaced => {
			if (!contentReplaced) {
				return checkModeAsync(path, mode, options);
			}
			return undefined;
		});
}

const touchAsync = (path: string, options: IOptions) => {
	return writeASync(path, options.content !== undefined ? options.content : '', {
		mode: options.mode,
		jsonIndent: options.jsonIndent
	});
};

export async function async(path: string, options: IOptions) {
	return new Promise((resolve, reject) => {
		options = defaults(options);
		isFileAsync(path)
			.then((stat: Stats) => {
				if (stat !== undefined) {
					return writeAsync(path, stat, options);
				}
				return touchAsync(path, options);
			})
			.then(resolve, reject);
	});
}

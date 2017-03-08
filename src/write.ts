import * as pathUtil from "path";
import * as fs from 'fs';
import { writeFileSync } from 'fs';
const Q = require('q');
import * as mkdirp from 'mkdirp';
import { json, file } from './imports';
import { IWriteOptions } from './interfaces';
import { validateArgument, validateOptions } from './utils/validate';

export type Data = string | Buffer | Object;
import { ReadWriteDataType } from './interfaces';

// Temporary file extensions used for atomic file overwriting.
const newExt = '.__new__';

export function validateInput(methodName: string, path: string, data: ReadWriteDataType, options: IWriteOptions): void {
	const methodSignature = methodName + '(path, data, [options])';
	validateArgument(methodSignature, 'path', path, ['string']);
	validateArgument(methodSignature, 'data', data, ['string', 'buffer', 'object', 'array']);
	validateOptions(methodSignature, 'options', options, {
		atomic: ['boolean'],
		jsonIndent: ['number'],
		progress: ['function']
	});
};

const toJson = (data: string | Buffer | Object, jsonIndent: number): string => {
	if (typeof data === 'object'
		&& !Buffer.isBuffer(data)
		&& data !== null) {
		return json.serialize(data, null, typeof jsonIndent !== 'number' ? 2 : jsonIndent);
	}
	return data as string;
};

// ---------------------------------------------------------
// SYNC
// ---------------------------------------------------------
const _writeFileSync = (path: string, data: any | string, options?: IWriteOptions): void => {
	try {
		writeFileSync(path, data, options);
	} catch (err) {
		if (err.code === 'ENOENT') {
			// Means parent directory doesn't exist, so create it and try again.
			mkdirp.sync(pathUtil.dirname(path));
			fs.writeFileSync(path, data, options);
		} else {
			throw err;
		}
	}
};

const writeAtomicSync = (path: string, data: string, options?: IWriteOptions): void => {
	return file.write_atomic(path + newExt, data, options, function () { });
};

export function sync(path: string, data: Data, options?: IWriteOptions): void {
	const opts: any = options || {};
	const processedData = toJson(data, opts.jsonIndent);
	const writeStrategy = opts.atomic ? writeAtomicSync : _writeFileSync;
	writeStrategy(path, processedData, { mode: opts.mode });
};

// ---------------------------------------------------------
// ASYNC
// ---------------------------------------------------------
const promisedWriteFile = Q.denodeify(fs.writeFile);
const promisedMkdirp = Q.denodeify(mkdirp);
const promisedAtomic = Q.denodeify(writeAtomicSync);
function writeFileAsync(path: string, data: string, options?: IWriteOptions): Promise<null> {
	return new Promise<null>((resolve, reject) => {
		promisedWriteFile(path, data, options)
			.then(resolve)
			.catch((err: any) => {
				// First attempt to write a file ended with error.
				// Check if this is not due to nonexistent parent directory.
				if (err.code === 'ENOENT') {
					// Parent directory doesn't exist, so create it and try again.
					promisedMkdirp(pathUtil.dirname(path))
						.then(() => promisedWriteFile(path, data, options))
						.then(resolve, reject);
				} else {
					// Nope, some other error, throw it.
					reject(err);
				}
			});
	});
};
export function async(path: string, data: Data, options?: IWriteOptions): Promise<null> {
	const opts: any = options || {};
	const processedData: string = toJson(data, opts.jsonIndent);
	return (opts.atomic ? promisedAtomic : writeFileAsync)(path, processedData, { mode: opts.mode });
};

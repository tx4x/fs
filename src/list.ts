import { readdirSync, readdir } from 'fs';
import { validateArgument } from './utils/validate';
import { isMacintosh } from './utils/platform';
import { normalizeNFC } from './utils/strings';

export function validateInput(methodName: string, path: string) {
	const methodSignature = methodName + '(path)';
	validateArgument(methodSignature, 'path', path, ['string', 'undefined']);
};

export function _readdirSync(path: string): string[] {
	// Mac: uses NFD unicode form on disk, but we want NFC
	// See also https://github.com/nodejs/node/issues/2165
	if (isMacintosh) {
		return readdirSync(path).map(c => normalizeNFC(c));
	}

	return readdirSync(path);
}
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
export function sync(path: string): string[] {
	try {
		return _readdirSync(path);
	} catch (err) {
		if (err.code === 'ENOENT') {
			// Doesn't exist. Return undefined instead of throwing.
			return undefined;
		}
		throw err;
	}
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
function readdirASync(path: string): Promise<string[]> {
	// export function readdir(path: string | Buffer, callback?: (err: NodeJS.ErrnoException, files: string[]) => void): void;
	// Mac: uses NFD unicode form on disk, but we want NFC
	// See also https://github.com/nodejs/node/issues/2165

	return new Promise<string[]>((resolve, reject) => {
		if (isMacintosh) {
			readdir(path, (err: NodeJS.ErrnoException, files: string[]) => {
				if (err) {
					reject(err);
				}
				resolve(files);
			});
		}
		readdir(path, (err: NodeJS.ErrnoException, files: string[]) => {
			if (err) {
				reject(err);
			}
			resolve(files);
		});
	});
}
export function async(path: string): Promise<string[]> {
	return new Promise<string[]>((resolve, reject) => {
		readdirASync(path)
			.then((list) => resolve(list))
			.catch(err => (err.code === 'ENOENT' ? resolve(undefined) : reject(err)));
	});
};

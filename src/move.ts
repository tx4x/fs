import * as  pathUtil from "path";
import { rename, renameSync } from 'fs';
import * as denodeify from 'denodeify';
import { async as existsAsync, sync as existsSync } from './exists';
import { validateArgument } from './utils/validate';
import { ErrDoesntExists } from './errors';
import { EError } from './interfaces';
import { sync as copySync } from './copy';
import { sync as removeSync } from './remove';
import { promisify } from 'util';
import { async as mkdirAsync, sync as dirSync } from './dir';
export function validateInput(methodName: string, from: string, to: string) {
	const methodSignature: string = methodName + '(from, to)';
	validateArgument(methodSignature, 'from', from, ['string']);
	validateArgument(methodSignature, 'to', to, ['string']);
};
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

export function sync(from: string, to: string): void {
	try {
		renameSync(from, to);
	} catch (err) {
		// not the same device, rename doesnt work here
		if (err.code === EError.CROSS_DEVICE) {
			try {
				copySync(from, to);
			} catch (e) {
				throw e;
			}
			try {
				removeSync(from);
			} catch (e) {
				throw e;
			}
			return;
		}
		if (err.code !== EError.NOEXISTS) {
			// We can't make sense of this error. Rethrow it.
			throw err;
		} else {
			// Ok, source or destination path doesn't exist.
			// Must do more investigation.
			if (!existsSync(from)) {
				throw ErrDoesntExists(from);
			}
			if (!existsSync(to)) {
				// Some parent directory doesn't exist. Create it.
				dirSync(pathUtil.dirname(to));
				// Retry the attempt
				renameSync(from, to);
			}
		}
	}
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

const promisedRename = promisify(rename);

const ensureDestinationPathExistsAsync = (to: string): Promise<any> =>{
	return new Promise<any>((resolve, reject) => {
		const destDir: string = pathUtil.dirname(to);
		existsAsync(destDir)
			.then(dstExists => {
				if (!dstExists) {
					mkdirAsync(destDir).then(resolve, reject);
				} else {
					// Hah, no idea.
					reject();
				}
			})
			.catch(reject);
	});
};

export function async(from: string, to: string): Promise<any> {
	return new Promise<any>((resolve, reject) => {
		promisedRename(from, to)
			.then(resolve)
			.catch(err => {
				if (err.code !== EError.NOEXISTS) {
					// Something unknown. Rethrow original error.
					reject(err);
				} else {
					// Ok, source or destination path doesn't exist.
					// Must do more investigation.
					existsAsync(from)
						.then(srcExists => {
							if (!srcExists) {
								reject(ErrDoesntExists(from));
							} else {
								ensureDestinationPathExistsAsync(to)
									// Retry the attempt
									.then(() => { return promisedRename(from, to); })
									.then(resolve, reject);
							}
						})
						.catch(reject);
				}
			});
	});
};

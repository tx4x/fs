import * as rm from 'rimraf';
import * as denodeify from 'denodeify';
import { validateArgument } from './utils/validate';
export function validateInput(methodName: string, path: string) {
	const methodSignature = methodName + '([path])';
	validateArgument(methodSignature, 'path', path, ['string', 'undefined']);
};
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
export function sync(path: string): void {
	rm.sync(path);
};
// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
const qrm = denodeify(rm);
export function async(path: string): Promise<null> {
	return qrm(path);
};

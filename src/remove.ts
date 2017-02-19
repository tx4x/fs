import * as rimraf from 'rimraf';
import * as denodeify from 'denodeify';
import { validateArgument } from './utils/validate';
export function validateInput(methodName: string, path: string) {
  const methodSignature = methodName + '([path])';
  validateArgument(methodSignature, 'path', path, ['string', 'undefined']);
};
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
export function sync(path: string):void {
  rimraf.sync(path);
};
// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
const qRimraf = denodeify(rimraf);
export function async(path: string): Promise<null> {
  return qRimraf(path);
};
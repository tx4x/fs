import * as Q from 'q';
import { sync as rimrafSync } from 'rimraf';
import { validateArgument } from './utils/validate';
export function validateInput(methodName: string, path: string) {
  const methodSignature = methodName + '([path])';
  validateArgument(methodSignature, 'path', path, ['string', 'undefined']);
};
// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
export function sync(path: string) {
  rimrafSync(path);
};
// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
const qRimraf = Q.denodeify(rimrafSync);
export function async(path: string) {
  return qRimraf(path);
};
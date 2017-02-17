import * as Q from 'q';
import {sync as rimrafSync} from 'rimraf';
import { argument, options } from './utils/validate';
export function validateInput(methodName: string, path: string) {
  const methodSignature = methodName + '([path])';
  argument(methodSignature, 'path', path, ['string', 'undefined']);
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
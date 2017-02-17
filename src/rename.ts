import * as pathUtil from 'path';
import { sync as moveSync, async as moveASync } from './move';
import { argument, options } from './utils/validate';

export function validateInput(methodName: string, path: string, newName: string): void {
  const methodSignature = methodName + '(path, newName)';
  argument(methodSignature, 'path', path, ['string']);
  argument(methodSignature, 'newName', newName, ['string']);
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

export function sync(path, newName) {
  const newPath = pathUtil.join(pathUtil.dirname(path), newName);
  moveSync(path, newPath);
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

export function async(path, newName) {
  const newPath = pathUtil.join(pathUtil.dirname(path), newName);
  return moveASync(path, newPath);
};

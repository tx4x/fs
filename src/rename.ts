import * as pathUtil from 'path';
import { sync as moveSync, async as moveASync } from './move';
import { validateArgument } from './utils/validate';

export function validateInput(methodName: string, path: string, newName: string): void {
  const methodSignature = methodName + '(path, newName)';
  validateArgument(methodSignature, 'path', path, ['string']);
  validateArgument(methodSignature, 'newName', newName, ['string']);
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
export function sync(path: string, newName: string) {
  moveSync(path, pathUtil.join(pathUtil.dirname(path), newName));
}

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
export function async(path, newName): Promise<null> {
  return moveASync(path, pathUtil.join(pathUtil.dirname(path), newName));
}

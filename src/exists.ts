import { Stats, statSync, stat } from 'fs';
import { validateArgument } from './utils/validate';
import { ENodeType, ErrnoException } from './interfaces';

export function validateInput(methodName: string, path: string) {
  const methodSignature = methodName + '(path)';
  validateArgument(methodSignature, 'path', path, ['string']);
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------
export function sync(path: string): boolean | string {
  let stat: Stats;
  try {
    stat = statSync(path);
    if (stat.isDirectory()) {
      return 'dir';
    } else if (stat.isFile()) {
      return 'file';
    }
    return 'other';
  } catch (err) {
    if (err.code !== 'ENOENT' && err.code !== 'ENOTDIR') {
      throw err;
    }
  }
  return false;
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------
export function async(path: string): Promise<boolean | string> {
  return new Promise((resolve, reject) => {
    stat(path, (err: ErrnoException, stat: Stats) => {
      if (err) {
        if (err.code === 'ENOENT') {
          resolve(false);
        } else {
          reject(err);
        }
      } else if (stat.isDirectory()) {
        resolve(ENodeType.DIR);
      } else if (stat.isFile()) {
        resolve(ENodeType.FILE);
      } else {
        resolve(ENodeType.OTHER);
      }
    });
  });
};

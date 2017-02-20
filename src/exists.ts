import { Stats, statSync, stat } from 'fs';
import { validateArgument } from './utils/validate';
import { EInspectItemType } from './interfaces';
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

export function async(path): Promise<boolean | string> {
  return new Promise((resolve, reject) => {
    stat(path, (err, stat: Stats) => {
      if (err) {
        if (err.code === 'ENOENT') {
          resolve(false);
        } else {
          reject(err);
        }
      } else if (stat.isDirectory()) {
        resolve(EInspectItemType.DIR);
      } else if (stat.isFile()) {
        resolve(EInspectItemType.FILE);
      } else {
        resolve(EInspectItemType.OTHER);
      }
    });
  });
};
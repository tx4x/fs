import {ErrnoException } from './interfaces';
export function ErrDoesntExists(path: string): Error {
  const err: any = new Error("Path to copy doesn't exist " + path);
  err.code = 'ENOENT';
  return err;
};

export function ErrDestinationExists(path: string): Error {
  const err: any = new Error('Destination path already exists ' + path);
  err.code = 'EEXIST';
  return err;
};
export function ErrIsNotDirectory(path: string): Error {
  const err = new ErrnoException('Path you want to find stuff in must be a directory ' + path);
  err.code = 'ENOTDIR';
  return err;
};

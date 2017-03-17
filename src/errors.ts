import { ErrnoException } from './interfaces';
const errno = require('errno');

Object.keys(errno.code).forEach(function (code) {
	const e = errno.code[code];
	exports[code] = (path: string) => {
		let err = new Error(code + ', ' + e.description + (path ? ' \'' + path + '\'' : '')) as ErrnoException;
		err.errno = e.errno;
		err.code = code;
		err.path = path;
		return err;
	};
});
export function ErrNoFileOrDir(path: string): Error {
	return new Error("Can't remove " + path + ' The path is not file nor directory');
};
export function ErrCantDelete(path: string): Error {
	return new Error("Can't remove " + path);
};
export function ErrNotFile(path: string): Error {
	return new Error('Path ' + path + ' exists but is not a file.' +
		' Halting jetpack.file() call for safety reasons.');
};
export function ErrNoDirectory(path: string): Error {
	return new Error('Path ' + path + ' exists but is not a directory.' +
		' Halting jetpack.dir() call for safety reasons.');
};

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

export const DOT_DIR_REGEX: RegExp = /(?:^|[\\\/])(\.\w+)[\\\/]/;
export function isDotDir(str: string) {
	return DOT_DIR_REGEX.test(str);
};
export function isDotFile(str: string) {
	if (str.charCodeAt(0) === 46 /* . */ && str.indexOf('/', 1) === -1) {
		return true;
	}

	const last = str.lastIndexOf('/');
	return last !== -1 ? str.charCodeAt(last + 1) === 46  /* . */ : false;
};

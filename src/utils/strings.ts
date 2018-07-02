export let canNormalize = typeof ((<any> '').normalize) === 'function';
const nonAsciiCharactersPattern = /[^\u0000-\u0080]/;
export const normalizeNFC = (str: string): string => {
	if (!canNormalize || !str) {
		return str;
	}

	let res: string;
	if (nonAsciiCharactersPattern.test(str)) {
		res = (<any> str).normalize('NFC');
	} else {
		res = str;
	}
	return res;
};

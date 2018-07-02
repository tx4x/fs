/**
 * The forward slash path separator.
 */
export const sep = '/';

/**
 * The native path separator depending on the OS.
 */
/*
export const nativeSep = isWindows ? '\\' : '/';

export function relative(from: string, to: string): string {
	// ignore trailing slashes
	const originalNormalizedFrom = rtrim(normalize(from), sep);
	const originalNormalizedTo = rtrim(normalize(to), sep);

	// we're assuming here that any non=linux OS is case insensitive
	// so we must compare each part in its lowercase form
	const normalizedFrom = isLinux ? originalNormalizedFrom : originalNormalizedFrom.toLowerCase();
	const normalizedTo = isLinux ? originalNormalizedTo : originalNormalizedTo.toLowerCase();

	const fromParts = normalizedFrom.split(sep);
	const toParts = normalizedTo.split(sep);

	let i = 0, max = Math.min(fromParts.length, toParts.length);

	for (; i < max; i++) {
		if (fromParts[i] !== toParts[i]) {
			break;
		}
	}

	const result = [
		...fill(fromParts.length - i, () => '..'),
		...originalNormalizedTo.split(sep).slice(i)
	];

	return result.join(sep);
}
*/

import { default as wildcard } from './wildcard';
const reMimePartSplit = /[\/\+\.]/;
/**
 * A simple function to checker whether a target mime type matches a mime-type
 * pattern (e.g. image/jpeg matches image/jpeg OR image/*).
 *
 * @export
 * @param {string} target
 * @param {string} pattern
 * @returns
 */
export default function (target: string, pattern: string) {
	function test(pattern) {
		let result = wildcard(pattern, target, reMimePartSplit);
		// ensure that we have a valid mime type (should have two parts)
		return result && result.length >= 2;
	}

	return pattern ? test(pattern.split(';')[0]) : test;
};

'use strict';

function WildcardMatcher(text, separator) {
	this.text = text = text || '';
	this.hasWild = ~text.indexOf('*');
	this.separator = separator;
	this.parts = text.split(separator);
}

WildcardMatcher.prototype.match = (input) => {
	let matches: boolean | Object | Array<any> = true;
	const parts = this.parts;
	let ii;
	const partsCount = parts.length;
	let testParts;

	if (typeof input === 'string' || input instanceof String) {
		if (!this.hasWild && this.text !== input) {
			matches = false;
		} else {
			testParts = (input || '').split(this.separator);
			for (ii = 0; matches && ii < partsCount; ii++) {
				if (parts[ii] === '*') {
					continue;
				} else if (ii < testParts.length) {
					matches = parts[ii] === testParts[ii];
				} else {
					matches = false;
				}
			}

			// If matches, then return the component parts
			matches = matches && testParts;
		}
	}else if (typeof input.splice === 'function') {
		matches = [];

		for (ii = input.length; ii--;) {
			if (this.match(input[ii])) {
				matches[(matches as String[]).length] = input[ii];
			}
		}
	}else if (typeof input === 'object') {
		matches = {};

		for (const key in input) {
			if (this.match(key)) {
				matches[key] = input[key];
			}
		}
	}

	return matches;
};

// tslint:disable-next-line:no-default-export
export default function (text: string, test: string, separator?: string | RegExp) {
	const matcher = new WildcardMatcher(text, separator || /[\/\.]/);
	if (typeof test !== 'undefined') {
		return matcher.match(test);
	}

	return matcher;
}

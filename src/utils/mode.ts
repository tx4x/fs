// Converts mode to string 3 characters long.
export const normalizeFileMode = (mode: string | number): string => {
	let modeAsString: string;
	if (typeof mode === 'number') {
		modeAsString = mode.toString(8);
	} else {
		modeAsString = mode;
	}
	return modeAsString.substring(modeAsString.length - 3);
};

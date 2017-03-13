export enum Platform {
	Web,
	Mac,
	Linux,
	Windows
}
let _isWindows = false;
let _isMacintosh = false;
let _isLinux = false;
let _isRootUser = false;
let _isNative = false;
let _isWeb = false;
let _isQunit = false;
export let _platform: Platform = Platform.Web;
// OS detection
if (typeof process === 'object') {
	_isWindows = (process.platform === 'win32');
	_isMacintosh = (process.platform === 'darwin');
	_isLinux = (process.platform === 'linux');
	_isRootUser = !_isWindows && (process.getuid() === 0);
	_isNative = true;
}
if (_isNative) {
	if (_isMacintosh) {
		_platform = Platform.Mac;
	} else if (_isWindows) {
		_platform = Platform.Windows;
	} else if (_isLinux) {
		_platform = Platform.Linux;
	}
}

export const isWindows = _isWindows;
export const isMacintosh = _isMacintosh;
export const isLinux = _isLinux;
export const isRootUser = _isRootUser;
export const isNative = _isNative;
export const isWeb = _isWeb;
export const isQunit = _isQunit;
export const platform = _platform;

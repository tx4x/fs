const write_fs = require('write-file-atomic');
export const file = {
  write_atomic: write_fs
};
export const json = {
  parse: JSON.parse,
  serialize: JSON.stringify
};

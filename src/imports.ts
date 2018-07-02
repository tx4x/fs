const writefs = require('write-file-atomic');
export const file = {
  write_atomic: writefs
};
export const json = {
  parse: JSON.parse,
  serialize: JSON.stringify
};

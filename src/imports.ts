import * as write_fs from 'write-file-atomic';
export const file = {
    write_atomic: write_fs
};
export const json = {
    parse: JSON.parse,
    serialize: JSON.stringify
};

export declare const file: {
    write_atomic: any;
};
export declare const json: {
    parse: (text: string, reviver?: (key: any, value: any) => any) => any;
    serialize: {
        (value: any, replacer?: (key: string, value: any) => any, space?: string | number): string;
        (value: any, replacer?: (string | number)[], space?: string | number): string;
    };
};

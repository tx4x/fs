export interface IOptions {
    matchBase: boolean;
    nocomment: boolean;
    dot: boolean;
}
export declare function create(basePath: string, patterns: string[], options?: IOptions): (absolutePath: string) => boolean;

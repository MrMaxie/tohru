import { Level } from './Logger';
export declare type TohruOptions = {
    electron: string;
    tickRate?: number;
    timeout?: number;
    typeInterval?: number;
    pollInterval?: number;
    logLevel?: Level;
    throwLevel?: Level;
    defaultLogger?: boolean;
    requirePath?: string;
    assetsPath?: string;
};
declare const _default: (options: TohruOptions) => {
    [name: string]: (ctx: {
        host: <T extends any, R extends any>(fn: (...params: T[]) => R | PromiseLike<R>, ...params: T[]) => Promise<R>;
        client: <T_1 extends any, R_1 extends any>(fn: (...params: T_1[]) => R_1 | PromiseLike<R_1>, ...params: T_1[]) => Promise<R_1>;
    }, ...params: any[]) => void;
};
export default _default;

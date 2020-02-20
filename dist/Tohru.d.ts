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
declare const _default: (options: TohruOptions) => import("./Queue").Palette;
export default _default;

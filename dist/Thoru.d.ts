declare type TohruOptions = {
    electron: string;
    tickRate?: number;
    timeout?: number;
    typeInterval?: number;
    pollInterval?: number;
};
declare type TohruInterface = {};
declare type Action = (...params: any[]) => TohruInterface;
declare const _default: (options: TohruOptions) => {
    [name: string]: Action;
};
export default _default;

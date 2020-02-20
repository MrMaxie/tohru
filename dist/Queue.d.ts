import Browser from './Browser';
import Logger from './Logger';
import { TohruOptions } from './Tohru';
declare type Context = {
    host: Browser['host'];
    client: Browser['client'];
};
declare type Action<T extends []> = {
    type: 'action';
    push: (...params: T) => Palette;
    fn: (ctx: Context, ...params: T) => void | Promise<any>;
};
declare type Procedure<T extends []> = {
    type: 'procedure';
    call: (...params: T) => Palette;
    fn: (palette: Palette, ...params: T) => void;
};
export declare type Palette = {
    [name: string]: Action<any>['fn'] | Procedure<any>['fn'];
};
export default class Queue {
    private logger;
    private browser;
    private config;
    private isWorking;
    private isKilled;
    private noopTimeout;
    private tickTimeout;
    private queue;
    private palette;
    constructor(logger: Logger, browser: Browser, config: Required<TohruOptions>);
    getPalette(): Palette;
    startNoop(name?: string, params?: any[]): void;
    stopNoop(): void;
    start(): void;
    registerAction(name: string, fn: Action<any>['fn']): void;
    registerProcedure(name: string, fn: Procedure<any>['fn']): void;
    push(name: string, params: any[]): void;
    next(): void;
    exec(name: string, params: any[]): Promise<any>;
    thenFn: (() => void) | false;
    then: (ctx: Context, fn: () => void) => void;
    catchFn: (() => void) | false;
    catch: (ctx: Context, fn: () => void) => void;
    end: () => void;
    action: (p: Palette, name: string, cb: (ctx: Context, ...params: any[]) => void) => void;
    procedure: (p: Palette, name: string, cb: (p: Palette, ...params: any[]) => void) => void;
    goto: (ctx: Context, url: string) => Promise<unknown>;
    type: (ctx: Context, selector: string, text: string) => Promise<unknown>;
    wait: (ctx: Context, target?: string | number) => Promise<unknown>;
    click: (ctx: Context, selector: string) => void;
    clickAll: (ctx: Context, selector: string) => void;
    authentication: (ctx: Context, login: string, password: string) => void;
    select: (ctx: Context, selector: string, option: string | number) => void;
    upload: (ctx: Context, selector: string, ...files: string[]) => Promise<unknown>;
}
export {};

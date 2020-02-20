import Browser from './Browser';
import Logger from './Logger';
import { TohruOptions } from './Tohru';
declare type Context = {
    host: Browser['host'];
    client: Browser['client'];
};
declare type Actions = {
    [name: string]: Action<any>['fn'];
};
declare type Action<T> = {
    push: (...params: T[]) => Actions;
    fn: (ctx: Context, ...params: T[]) => void;
};
declare const Actions: string[];
export default class Queue {
    private logger;
    private browser;
    private config;
    private isWorking;
    private isKilled;
    private noopTimeout;
    private tickTimeout;
    private queue;
    private actionsPalette;
    constructor(logger: Logger, browser: Browser, config: Required<TohruOptions>);
    getActions(): Actions;
    startNoop(name?: string, params?: any[]): void;
    stopNoop(): void;
    start(): void;
    register(name: string, fn: (ctx: Context, ...params: any[]) => void, instant?: boolean): void;
    push(name: string, params: any[]): void;
    next(): void;
    exec(name: string, params: any[]): Promise<void>;
    thenFn: (() => void) | false;
    then: (ctx: Context, fn: () => void) => void;
    catchFn: (() => void) | false;
    catch: (ctx: Context, fn: () => void) => void;
    end: () => void;
    action: (name: string, cb: (ctx: Context, ...params: any[]) => void) => Actions;
    goto: (ctx: Context, url: string) => Promise<unknown>;
    type: (ctx: Context, selector: string, text: string) => Promise<unknown>;
    wait: (ctx: Context, target?: string | number) => Promise<unknown>;
    click: (ctx: Context, selector: string) => Promise<void>;
    clickAll: (ctx: Context, selector: string) => Promise<void>;
    authentication: (ctx: Context, login: string, password: string) => Promise<void>;
    select: (ctx: Context, selector: string, option: string | number) => Promise<void>;
    upload: (ctx: Context, selector: string, ...files: string[]) => Promise<unknown>;
}
export {};

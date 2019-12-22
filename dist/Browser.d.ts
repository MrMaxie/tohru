import Logger from './Logger';
export default class Browser {
    private logger;
    private electronPath;
    private requirePath;
    isStarted: boolean;
    isKilled: boolean;
    private proc;
    private http;
    private io;
    private id;
    constructor(logger: Logger, electronPath: string, requirePath: string);
    start(): Promise<void>;
    kill(): void;
    host: <T extends any, R extends any>(fn: (...params: T[]) => R | PromiseLike<R>, ...params: T[]) => Promise<R>;
    client: <T extends any, R extends any>(fn: (...params: T[]) => R | PromiseLike<R>, ...params: T[]) => Promise<R>;
    private eval;
}

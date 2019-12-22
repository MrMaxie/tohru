import Browser from './Browser';
import Logger from './Logger';
import { TohruOptions } from './Tohru';

type Context = {
    host: Browser['host'];
    client: Browser['client'];
};

type Actions = {
    [name: string]: Action<any>['fn'];
};

type Action<T> = {
    push: (...params: T[]) => Actions;
    fn: (ctx: Context, ...params: T[]) => void;
};

export default class Queue {
    private isWorking = false;

    private isKilled = false;

    private noopTimeout: NodeJS.Timeout | false = false;

    private tickTimeout: NodeJS.Timeout | false = false;

    private queue: Array<{
        name: string;
        params: any[];
    }> = [];

    private actionsPalette: {
        [name: string]: Action<any>;
    } = {};

    constructor(
        private logger: Logger,
        private browser: Browser,
        private config: Required<TohruOptions>,
    ) {
        logger.on('critical', () => {
            this.end();
        });

        process.on('beforeExit', () => {
            this.end();
        });

        [
            'then',
            'catch',
            'end',
            'action',
            'goto',
            'type',
            'wait',
        ].forEach(name => {
            this.register(name, this[name]);
        });
    }

    get actions(): Actions {
        const actions = {};

        for (const name in this.actionsPalette) {
            actions[name] = this.actionsPalette[name].push;
        }

        return actions;
    }

    startNoop(name?: string, params?: any[]) {
        this.stopNoop();
        this.noopTimeout = setTimeout(() => {
            if (name) {
                this.logger.error('too long processing %s with params: %s', name, params);
            } else {
                this.logger.error('there was no operation for too long');
            }
            this.end();
        }, this.config.timeout);
    }

    stopNoop() {
        if (this.noopTimeout) {
            clearTimeout(this.noopTimeout);
        }
    }

    start() {
        if (this.isKilled) {
            return;
        }

        this.logger.debug('starting servers');
        this.browser.start().then(() => {
            this.logger.debug('servers started');
            this.isWorking = false;
            this.next();
        });
    }

    register(name: string, fn: (ctx: Context, ...params: any[]) => void) {
        this.logger.debug('registering action %s', name);

        this.actionsPalette[name] = {
            push: (...params: any[]) => {
                this.push(name, params);
                return this.actions;
            },
            fn,
        };
    }

    push(name: string, params: any[]) {
        this.logger.debug('pusing action %s -> %s', name, params);

        this.queue.push({ name, params });
        this.next();
    }

    next() {
        if (this.isWorking || this.isKilled) {
            return;
        }

        this.isWorking = true;
        this.startNoop();

        if (!this.browser.isStarted) {
            this.stopNoop();
            this.start();
            return;
        }

        if (this.queue.length === 0) {
            if (this.thenFn) {
                this.thenFn();
                this.thenFn = false;
                this.isWorking = false;
            }
            return;
        }

        const { name, params } = this.queue.shift();

        this.tickTimeout = setTimeout(() => {
            this.tickTimeout = false;
            this.startNoop(name, params);
            Promise.resolve(this.exec(name, params))
                .then(() => {
                    this.isWorking = false;
                    this.next();
                });
        }, this.config.tickRate);
    }

    exec(name: string, params: any[]) {
        if (this.isKilled) {
            return;
        }

        this.logger.debug('action %s -> %s', name, params);

        if (!(name in this.actionsPalette)) {
            this.logger.debug('action %s doesnt exists', name);
            return;
        }

        const { fn } = this.actionsPalette[name];

        return Promise.resolve(fn({
            host: this.browser.host,
            client: this.browser.client,
        }, ...params));
    }

    // Internal actions
    thenFn: (() => void) | false = false;

    then = (ctx: Context, fn: () => void) => {
        this.thenFn = fn;
    }

    catchFn: (() => void) | false = false;

    catch = (ctx: Context, fn: () => void) => {
        this.catchFn = fn;
    }

    end = () => {
        this.isKilled = true;
        this.queue = [];
        this.stopNoop();
        if (this.tickTimeout) {
            clearTimeout(this.tickTimeout);
        }
        this.browser.kill();
    }

    action = (ctx: Context, name: string, cb: (ctx: Context, ...params: any[]) => void) => {
        this.register(name, cb);
    }

    goto = (ctx: Context, url: string) => {
        return ctx.host(url => {
            console.log('hello from host', url);

            (window as any).loadURL(url);

            return new Promise(res => {
                (window as any).webContents.once('dom-ready', () => {
                    res();
                });
            });
        }, url);
    }

    type = (ctx: Context, selector: string, text: string) => {
        return ctx.client((selector: string, text: string, time: number) => {
            return new Promise((res, rej) => {
                const chars = text.split('');
                const el = document.querySelector(selector);

                if (!el || !(el instanceof HTMLInputElement)) {
                    rej(`cannot find element ${el}`);
                    return;
                }

                (el as any).focus();
                const interval = setInterval(() => {
                    if (chars.length === 0) {
                        res();
                        clearInterval(interval);
                        return;
                    }

                    const char = chars.shift();
                    const ev = new KeyboardEvent('keyup', {
                        key: char,
                    });
                    el.value = [el.value, char].join('');
                    el.dispatchEvent(ev);
                }, time);
            });
        }, selector, text, this.config.pollInterval);
    }

    wait = (ctx: Context, target: string | number) => {
        if (typeof target === 'number') {
            return new Promise(res => {
                setTimeout(() => {
                    res();
                }, target);
            });
        } else {
            return ctx.client((target: string, time: number) => {
                return new Promise(res => {
                    const search = () => {
                        if (document.querySelector(target)) {
                            res();
                            clearInterval(interval);
                        }
                    };

                    const interval = setInterval(search, time);
                    search();
                });
            }, target, this.config.pollInterval);
        }
    }
}
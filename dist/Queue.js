"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Actions = [
    'then',
    'catch',
    'end',
    'action',
    'goto',
    'type',
    'wait',
];
const ProtectedActions = [
    'then',
    'catch',
    'end',
    'action',
];
class Queue {
    constructor(logger, browser, config) {
        this.logger = logger;
        this.browser = browser;
        this.config = config;
        this.isWorking = false;
        this.isKilled = false;
        this.noopTimeout = false;
        this.tickTimeout = false;
        this.queue = [];
        this.actionsPalette = {};
        // Internal actions
        this.thenFn = false;
        this.then = (ctx, fn) => {
            this.thenFn = fn;
        };
        this.catchFn = false;
        this.catch = (ctx, fn) => {
            this.catchFn = fn;
        };
        this.end = () => {
            this.isKilled = true;
            this.queue = [];
            this.stopNoop();
            if (this.tickTimeout) {
                clearTimeout(this.tickTimeout);
            }
            this.browser.kill();
        };
        this.action = (ctx, name, cb) => {
            if (ProtectedActions.indexOf(name) !== -1) {
                this.logger.warning('action name %s is protected and cannot be overridden', name);
                return;
            }
            this.register(name, cb);
        };
        this.goto = (ctx, url) => {
            return ctx.host(url => {
                console.log('hello from host', url);
                window.loadURL(url);
                return new Promise(res => {
                    window.webContents.once('dom-ready', () => {
                        res();
                    });
                });
            }, url);
        };
        this.type = (ctx, selector, text) => {
            return ctx.client((selector, text, time) => {
                return new Promise((res, rej) => {
                    const chars = text.split('');
                    const el = document.querySelector(selector);
                    if (!el || !(el instanceof HTMLInputElement)) {
                        rej(`cannot find element ${el}`);
                        return;
                    }
                    el.focus();
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
        };
        this.wait = (ctx, target) => {
            if (typeof target === 'number') {
                return new Promise(res => {
                    setTimeout(() => {
                        res();
                    }, target);
                });
            }
            else {
                return ctx.client((target, time) => {
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
        };
        logger.on('critical', () => {
            this.end();
        });
        process.on('beforeExit', () => {
            this.end();
        });
        Actions.forEach(name => {
            this.register(name, this[name]);
        });
    }
    get actions() {
        const actions = {};
        for (const name in this.actionsPalette) {
            actions[name] = this.actionsPalette[name].push;
        }
        return actions;
    }
    startNoop(name, params) {
        this.stopNoop();
        this.noopTimeout = setTimeout(() => {
            if (name) {
                this.logger.error('too long processing %s with params: %s', name, params);
            }
            else {
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
    register(name, fn) {
        this.logger.debug('registering action %s', name);
        this.actionsPalette[name] = {
            push: (...params) => {
                this.push(name, params);
                return this.actions;
            },
            fn,
        };
    }
    push(name, params) {
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
    exec(name, params) {
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
}
exports.default = Queue;

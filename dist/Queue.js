var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const Actions = [
    'then',
    'catch',
    'end',
    'goto',
    'type',
    'wait',
    'click',
    'clickAll',
    'authentication',
    'select',
    'upload',
    'focus',
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
        this.action = (name, cb) => {
            this.logger.debug('action registering %s -> %s', name, cb);
            if (ProtectedActions.indexOf(name) !== -1) {
                this.logger.warning('action name %s is protected and cannot be overridden', name);
                return;
            }
            this.register(name, cb);
            return this.getActions();
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
            if (typeof target === 'string') {
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
            return Promise.resolve();
        };
        this.click = (ctx, selector) => {
            return ctx.client((target) => {
                const el = document.body.querySelector(target);
                if (el) {
                    el.click();
                }
            }, selector);
        };
        this.clickAll = (ctx, selector) => {
            return ctx.client((target) => {
                Array.from(document.body.querySelectorAll(target)).forEach((el) => {
                    el.click();
                });
            }, selector);
        };
        this.authentication = (ctx, login, password) => {
            return ctx.host((l, p) => {
                app.once('login', (e, w, d, a, cb) => {
                    e.preventDefault();
                    cb(l, p);
                });
            }, login, password);
        };
        this.select = (ctx, selector, option) => {
            return ctx.client((target) => {
                const el = document.body.querySelector(target);
                if (!el) {
                    return;
                }
                const done = Array.from(el.querySelectorAll('option'))
                    .filter(x => x.innerText === String(option))
                    .some(x => {
                    el.value = String(x.value);
                    return true;
                });
                if (done) {
                    return;
                }
                if (typeof option === 'string') {
                    el.value = option;
                    return;
                }
                if (typeof option === 'number') {
                    el.selectedIndex = option;
                    return;
                }
            }, selector);
        };
        this.upload = (ctx, selector, ...files) => {
            files = files.map(x => path_1.default.resolve(this.config.assetsPath, x));
            return ctx.host((target, paths) => {
                const el = document.body.querySelector(target);
                if (!el) {
                    return Promise.resolve();
                }
                return new Promise(res => {
                    const files = paths
                        .map(x => require('fs').readFileSync(x))
                        .map(x => new Buffer(x).toString('base64'))
                        .map(x => fetch(x).then(res => res.blob()));
                    Promise.all(files).then(blobs => {
                        const dt = new DataTransfer();
                        blobs.forEach((file, i) => {
                            dt.items.add(new File([file], `${i}-file.jpg`));
                        });
                        el.files = dt.files;
                        res();
                    });
                });
            }, selector, files);
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
    getActions() {
        const actions = {
            action: this.action,
        };
        for (const name in this.actionsPalette) {
            actions[name] = this.actionsPalette[name].push;
        }
        return actions;
    }
    startNoop(name, params) {
        this.stopNoop();
        this.noopTimeout = setTimeout(() => {
            if (name) {
                this.logger.critical('too long processing %s with params: %s', name, params);
            }
            else {
                this.logger.critical('there was no operation for too long');
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
    register(name, fn, instant = false) {
        this.logger.debug('registering action %s', name);
        this.actionsPalette[name] = {
            push: (...params) => {
                this.push(name, params);
                this.logger.debug('pushing %s with %s', name, params);
                return this.getActions();
            },
            fn,
        };
    }
    push(name, params) {
        this.logger.debug('pushing action %s -> %s', name, params);
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

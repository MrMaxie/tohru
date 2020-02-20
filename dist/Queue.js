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
const Procedures = [
    'action',
    'procedure',
];
const ProtectedActionsAndProcedures = [
    'action',
    'procedure',
    'then',
    'catch',
    'end',
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
        this.palette = {};
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
        this.action = (p, name, cb) => {
            this.logger.debug('action registering %s -> %s', name, cb);
            if (ProtectedActionsAndProcedures.indexOf(name) !== -1) {
                this.logger.warning('action name %s is protected and cannot be overridden', name);
                return;
            }
            this.registerAction(name, cb);
        };
        this.procedure = (p, name, cb) => {
            this.logger.debug('procedure registering %s -> %s', name, cb);
            if (ProtectedActionsAndProcedures.indexOf(name) !== -1) {
                this.logger.warning('procedure name %s is protected and cannot be overridden', name);
                return;
            }
            this.registerProcedure(name, cb);
        };
        this.goto = (ctx, url) => {
            return ctx.host(url => {
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
            ctx.client((target) => {
                const el = document.body.querySelector(target);
                if (el) {
                    el.click();
                }
            }, selector);
        };
        this.clickAll = (ctx, selector) => {
            ctx.client((target) => {
                Array.from(document.body.querySelectorAll(target)).forEach((el) => {
                    el.click();
                });
            }, selector);
        };
        this.authentication = (ctx, login, password) => {
            ctx.host((l, p) => {
                app.once('login', (e, w, d, a, cb) => {
                    e.preventDefault();
                    cb(l, p);
                });
            }, login, password);
        };
        this.select = (ctx, selector, option) => {
            ctx.client((target) => {
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
            this.registerAction(name, this[name]);
        });
        Procedures.forEach(name => {
            this.registerProcedure(name, this[name]);
        });
    }
    getPalette() {
        const palette = {};
        for (const name in this.palette) {
            const item = this.palette[name];
            palette[name] = item[item.type === 'procedure' ? 'call' : 'push'];
        }
        Object.keys(palette);
        return palette;
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
    registerAction(name, fn) {
        this.logger.debug('registering action %s', name);
        this.palette[name] = {
            type: 'action',
            push: (...params) => {
                this.push(name, params);
                this.logger.debug('pushing %s with %s', name, params);
                return this.getPalette();
            },
            fn,
        };
    }
    registerProcedure(name, fn) {
        this.logger.debug('registering procedure %s', name);
        this.palette[name] = {
            type: 'procedure',
            call: (...params) => {
                fn(this.getPalette(), ...params);
                return this.getPalette();
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
            return Promise.resolve();
        }
        this.logger.debug('exec %s -> %s', name, params);
        if (!(name in this.palette)) {
            this.logger.debug('action %s doesnt exists', name);
            return Promise.resolve();
        }
        const item = this.palette[name];
        if (item.type === 'procedure') {
            return Promise.resolve();
        }
        return Promise.resolve(item.fn({
            host: this.browser.host,
            client: this.browser.client,
        }, ...params));
    }
}
exports.default = Queue;

import Logger, { Level } from './Logger';
import Browser from './Browser';
import Queue from './Queue';

export type TohruOptions = {
    electron: string;
    tickRate?: number;
    timeout?: number;
    typeInterval?: number;
    pollInterval?: number;
    logLevel?: Level;
    defaultLogger?: boolean;
    requirePath?: string;
};

export default (options: TohruOptions) => {
    const _options = Object.assign({
        tickRate: 500,
        timeout: 10000,
        typeInterval: 50,
        pollInterval: 50,
        logLevel: Level.Error,
        defaultLogger: true,
        requirePath: process.cwd(),
    }, options) as Required<TohruOptions>;

    const logger = new Logger();

    logger.setLevel(_options.logLevel);

    if (_options.defaultLogger) {
        logger.startDefaultLogger();
    }

    const browser = new Browser(
        logger,
        _options.electron,
        _options.requirePath,
    );

    const queue = new Queue(logger, browser, _options);

    return queue.actions;

    /*
    let proc: ChildProcess | false = false;

    let timeoutTimeout: NodeJS.Timeout | false = false;

    let tickTimeout: NodeJS.Timeout | false = false;

    const queue: Array<{
        name: string;
        params: any[];
    }> = [];

    // Exposed object
    const actions: {
        [name: string]: Action;
    } = {};

    // Internal object
    const reactions: {
        [name: string]: Reaction;
    } = {};

    let thenFn: (() => {}) | false = false;

    let catchFn: ((reason: string) => {}) | false = false;

    const context: Context = new Context;

    const tryKillProcess = () => {
        if (proc) {
            isDone = true;
            (proc as any).stdin.pause();
            proc.kill('SIGKILL');
            proc = false;
            context.stop();
            if (timeoutTimeout) {
                clearTimeout(timeoutTimeout);
            }
            if (tickTimeout) {
                clearTimeout(tickTimeout);
            }
        }
    };

    const throwError = (reason: string) => {
        tryKillProcess();

        if (catchFn) {
            catchFn(reason);
            return;
        }

        throw new Error(reason);
    };

    process.on('beforeExit', () => {
        tryKillProcess();
    });

    let isWorking = false;

    let isDone = false;

    const start = () => {
        if (isDone) {
            return;
        }

        portfinder.getPort((err, port) => {
            if (err) {
                throwError(err.message);
                return;
            }

            context.stop();
            context.start(port);

            context.once('connected', () => {
                console.log('# connected');
                isWorking = false;
                nextStep();
            });

            proc = spawn(opts.electron, [path.resolve(__dirname, './host.js'), String(port)]);
            proc.on('error', error => {
                if (isDone) {
                    return;
                }

                throwError(`${error.name} - ${error.message}`);
            });
            proc.on('disconnect', () => {
                if (isDone) {
                    return;
                }

                throwError(`Process has been disconnected...`);
            });
            proc.on('close', code => {
                if (isDone) {
                    return;
                }

                if (code !== 0) {
                    throwError(`Process has been terminated with non-zero code...`);
                }
            });
            proc.on('exit', code => {
                if (isDone) {
                    return;
                }

                if (code !== 0) {
                    throwError(`Process has been terminated with non-zero code...`);
                }
            });
        });
    };

    const nextStep = () => {
        if (isWorking) {
            return;
        }

        isWorking = true;

        if (proc === false || proc.killed === true) {
            start();
            return;
        }

        if (timeoutTimeout) {
            clearTimeout(timeoutTimeout);
        }

        timeoutTimeout = setTimeout(() => {
            throwError(`There was no operation for too long...`);
        }, opts.timeout);

        if (queue.length === 0) {
            if (thenFn) {
                thenFn();
                thenFn = false;
            }
            return;
        }

        const { name, params } = queue.shift();

        console.log('-> ', name);

        if (!(name in reactions)) {
            if (name in actions) {
                nextStep();
            }
            return;
        }

        const cb = reactions[name];

        if (timeoutTimeout) {
            clearTimeout(timeoutTimeout);
        }

        tickTimeout = setTimeout(() => {
            tickTimeout = false;
            timeoutTimeout = setTimeout(() => {
                throwError(`Processing .${name}(${params.map(x => JSON.stringify(x)).join(', ')}) action takes too long...`);
            }, opts.timeout);

            Promise.resolve(cb(context, params))
                .then(() => {
                    isWorking = false;
                    nextStep();
                })
                .catch(throwError);
        }, opts.tickRate);
    };

    actions.pushQueue = (name: string, params: any[]) => {
        queue.push({ name, params });
        nextStep();
        return actions;
    };

    actions.action = (name: string, cb: (ctx: Context, ...params: any[]) => void) => {
        actions[name] = (...params: any[]) => {
            actions.pushQueue(name, params);
            return actions;
        };
        reactions[name] = cb;
        return actions;
    };

    actions.action('goto', (ctx: Context, [ url ]) => {
        return ctx.hostEval(({ window, webContents }, url) => {
            window.loadURL(url);

            return new Promise(res => {
                webContents.once('dom-ready', () => {
                    res();
                });
            });
        }, url);
    });

    actions.action('then', (ctx: Context, [ promise ]) => {
        return Promise.resolve(promise ? promise() : undefined);
    });

    actions.action('wait', (ctx: Context, [ target ]) => {
        if (typeof target === 'number') {
            return new Promise(res => {
                setTimeout(() => {
                    res();
                }, target);
            });
        } else {
            return ctx.clientEval(({ document }, { target, time }) => {
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
            }, { target, time: opts.pollInterval });
        }
    });

    actions.action('end', () => {
        tryKillProcess();
    });

    actions.action('type', (ctx: Context, [ selector, text ]) => {
        return ctx.clientEval(({ document }, { selector, text, time }) => {
            return new Promise((res, rej) => {
                console.log(selector, text, time);

                const chars = text.split('');
                const el = document.querySelector(selector);

                if (!el) {
                    rej(`Cannot find element ${el}`);
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
        }, { selector, text, time: opts.pollInterval });
    });
    */
    /*
    type(selector: string, text: string) {
        return this;
    }

    click(selector: string) {
        return this;
    }

    private _then: () => void = () => {};

    then(cb: () => void) {
        this._then = cb;
        return this;
    }

    private _catch: (reason: string) => void = () => {};

    catch(cb: (reason: string) => void) {
        this._catch = cb;
        return this;
    }

    back() {
        return this;
    }

    forward() {
        return this;
    }

    refresh() {
        return this;
    }

    mousedown() {
        return this;
    }

    mouseup() {
        return this;
    }

    mouseover() {
        return this;
    }

    mouseout() {
        return this;
    }

    insert() {
        return this;
    }

    check() {
        return this;
    }

    uncheck() {
        return this;
    }

    select() {
        return this;
    }

    scrollTo() {
        return this;
    }

    wait() {
        return this;
    }

    exists() {
        return this;
    }

    visible() {
        return this;
    }

    on() {
        return this;
    }

    once() {
        return this;
    }

    off() {
        return this;
    }

    screenshot() {
        return this;
    }

    end() {
        return this;
    }
    */
}
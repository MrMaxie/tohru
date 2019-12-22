"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const child_process_1 = require("child_process");
const portfinder_1 = tslib_1.__importDefault(require("portfinder"));
const path_1 = tslib_1.__importDefault(require("path"));
const socket_io_1 = tslib_1.__importDefault(require("socket.io"));
const http_1 = tslib_1.__importDefault(require("http"));
class Browser {
    constructor(logger, electronPath, requirePath) {
        this.logger = logger;
        this.electronPath = electronPath;
        this.requirePath = requirePath;
        this.isStarted = false;
        this.isKilled = false;
        this.id = 0;
        this.host = (fn, ...params) => {
            return this.eval('host', fn, ...params);
        };
        this.client = (fn, ...params) => {
            return this.eval('client', fn, ...params);
        };
        this.eval = (type, fn, ...params) => {
            const id = this.id += 1;
            const doneName = `done:${id}`;
            this.logger.debug('running task %s#%s -> %s', type, id, params);
            return new Promise((res, rej) => {
                const { io } = this;
                if (!io) {
                    rej('socket -> socket is not initialized or crashed');
                    return;
                }
                io.emit(`${type}:eval`, `(${fn.toString()})`, id, ...params);
                const sockets = Object.values(io.sockets.connected);
                const done = (type, ...data) => {
                    this.logger.debug('done task #%s -> %s => %s', id, type, data);
                    if (type === 'then') {
                        res(...data);
                    }
                    if (type === 'catch') {
                        rej(...data);
                    }
                    sockets.forEach(x => x.off(doneName, done));
                };
                sockets.forEach(x => x.on(doneName, done));
            });
        };
        logger.on('critical', () => {
            this.kill();
        });
    }
    start() {
        if (this.isStarted) {
            return;
        }
        const { logger: log, electronPath, requirePath } = this;
        return new Promise((res, rej) => {
            portfinder_1.default.getPort((err, port) => {
                if (err) {
                    rej(err.message);
                    return;
                }
                this.http = http_1.default.createServer();
                this.io = socket_io_1.default(this.http);
                this.http.listen(port);
                this.http.on('close', () => {
                    if (this.isKilled) {
                        return;
                    }
                    log.critical('http -> closed');
                });
                this.http.on('error', e => {
                    if (this.isKilled) {
                        return;
                    }
                    log.critical('http -> %s', e);
                });
                this.io.on('connection', socket => {
                    res();
                    this.isStarted = true;
                    log.info('connected');
                    socket.on('error', res => {
                        if (this.isKilled) {
                            return;
                        }
                        log.error('%s', res);
                    });
                    socket.on('info', res => {
                        if (this.isKilled) {
                            return;
                        }
                        log.info('%s', res);
                    });
                    socket.on('critical', res => {
                        if (this.isKilled) {
                            return;
                        }
                        log.critical('%s', res);
                    });
                    socket.on('warning', res => {
                        if (this.isKilled) {
                            return;
                        }
                        log.warning('%s', res);
                    });
                    socket.on('connect_error', res => {
                        if (this.isKilled) {
                            return;
                        }
                        log.critical('socket -> %s', res);
                    });
                });
                this.proc = child_process_1.spawn(electronPath, [
                    path_1.default.resolve(__dirname, './host.js'),
                    String(port),
                    requirePath,
                ]);
                this.proc.on('error', err => {
                    if (this.isKilled) {
                        return;
                    }
                    log.critical('host -> %s', err);
                });
                this.proc.on('disconnect', () => {
                    if (this.isKilled) {
                        return;
                    }
                    log.info('host -> disconnected');
                });
                this.proc.on('close', code => {
                    if (this.isKilled) {
                        return;
                    }
                    if (code !== 0) {
                        log.critical('host -> process has been closed with non-zero code %s', code);
                    }
                    this.kill();
                });
                this.proc.on('exit', code => {
                    if (this.isKilled) {
                        return;
                    }
                    if (code !== 0) {
                        log.critical('host -> process has been closed with non-zero code %s', code);
                    }
                    this.kill();
                });
            });
        });
    }
    kill() {
        if (this.isKilled) {
            return;
        }
        this.isStarted = false;
        this.isKilled = true;
        this.logger.info('closing all connections');
        const { http, io, proc } = this;
        if (proc && !proc.killed) {
            proc.removeAllListeners();
            proc.kill('SIGKILL');
            proc.stdin.pause();
        }
        if (io) {
            io.close();
        }
        if (http && http.listening) {
            http.removeAllListeners();
            setTimeout(() => {
                http.close();
            }, 300);
        }
    }
}
exports.default = Browser;

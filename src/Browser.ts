import { spawn, ChildProcess } from 'child_process';
import portfinder from 'portfinder';
import path from 'path';
import io from 'socket.io';
import http from 'http';
import Logger from './Logger';

export default class Browser {
    isStarted = false;

    isKilled = false;

    private proc: ChildProcess;

    private http: http.Server;

    private io: io.Server;

    private id = 0;

    constructor(private logger: Logger, private electronPath: string, private requirePath: string) {
        logger.on('critical', () => {
            this.kill();
        });
    }

    start(): Promise<void> {
        if (this.isStarted) {
            return;
        }

        const { logger: log, electronPath, requirePath } = this;

        return new Promise((res, rej) => {
            portfinder.getPort((err, port) => {
                if (err) {
                    rej(err.message);
                    return;
                }

                this.http = http.createServer();
                this.io = io(this.http);
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

                this.proc = spawn(electronPath, [
                    path.resolve(__dirname, './host.js'),
                    String(port),
                    requirePath,
                ])

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
            (proc as any).stdin.pause();
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

    host = <T extends any, R extends any>(fn: (...params: T[]) => R | PromiseLike<R>, ...params: T[]): Promise<R> => {
        return this.eval('host', fn, ...params);
    };

    client = <T extends any, R extends any>(fn: (...params: T[]) => R | PromiseLike<R>, ...params: T[]): Promise<R> => {
        return this.eval('client', fn, ...params);
    };

    private eval = <T extends any, R extends any>(type: 'host' | 'client', fn: (...params: T[]) => R | PromiseLike<R>, ...params: T[]): Promise<R> => {
        const id = this.id += 1;
        const doneName = `done:${id}`;

        this.logger.debug('running task %s#%s -> %s', type, id, params);

        return new Promise<R>((res, rej) => {
            const { io } = this;

            if (!io) {
                rej('socket -> socket is not initialized or crashed');
                return;
            }

            io.emit(`${type}:eval`, `(${fn.toString()})`, id, ...params);
            const sockets = Object.values(io.sockets.connected);

            const done = (type: 'then' | 'catch', ...data: any[]) => {
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
}

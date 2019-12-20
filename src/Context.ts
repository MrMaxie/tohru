import EventEmitter from 'events';
import io from 'socket.io';
import http from 'http';
import { BrowserWindow, WebContents } from 'electron';

export type HostContext = {
    window: BrowserWindow;
    webContents: WebContents;
};

export type ClientContext = {
    document: Document;
    window: Window;
};

export default class Context extends EventEmitter {
    private _http: http.Server;

    private _io: io.Server;

    start(port: number) {
        this._http = http.createServer(() => {});
        this._io = io(this._http);
        this._http.listen(port);

        this._io.on('connection', socket => {
            this.emit('connected');

            socket.on('done', res => {
                this.emit('done', res);
            });

            socket.on('error', res => {
                this.emit('error', res);
            });
        });
    }

    hostEval = <T extends any>(fn: (context: HostContext, param: T) => any, param?: T) => {
        return this._eval('host', fn, param);
    };

    clientEval = <T extends any>(fn: (context: ClientContext, param: T) => any, param?: T) => {
        return this._eval('client', fn, param);
    };

    private _eval = (type: 'host' | 'client', fn: (...params: any[]) => any, param?: any) => {
        return new Promise((res, rej) => {
            const { _io } = this;

            if (_io) {
                _io.emit(`${type}:eval`, this._prepareFn(fn), param);

                const _res = (x: any) => {
                    this.off('done', _res);
                    this.off('error', _rej);
                    res(x);
                };

                const _rej = (x: any) => {
                    this.off('done', _res);
                    this.off('error', _rej);
                    rej(x);
                };

                this.once('done', _res);
                this.once('error', _rej);
                return;
            }

            rej();
        });
    };

    private _prepareFn = (fn: (...args: any[]) => any) => {
        return `(${fn.toString()})`;
    };

    stop() {
        const { _io, _http } = this;

        if (_io) {
            _io.close();
        }

        if (_http) {
            _http.close();
        }
    }

};

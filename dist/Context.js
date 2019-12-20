"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const events_1 = tslib_1.__importDefault(require("events"));
const socket_io_1 = tslib_1.__importDefault(require("socket.io"));
const http_1 = tslib_1.__importDefault(require("http"));
class Context extends events_1.default {
    constructor() {
        super(...arguments);
        this.hostEval = (fn, param) => {
            return this._eval('host', fn, param);
        };
        this.clientEval = (fn, param) => {
            return this._eval('client', fn, param);
        };
        this._eval = (type, fn, param) => {
            return new Promise((res, rej) => {
                const { _io } = this;
                if (_io) {
                    _io.emit(`${type}:eval`, this._prepareFn(fn), param);
                    const _res = (x) => {
                        this.off('done', _res);
                        this.off('error', _rej);
                        res(x);
                    };
                    const _rej = (x) => {
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
        this._prepareFn = (fn) => {
            return `(${fn.toString()})`;
        };
    }
    start(port) {
        this._http = http_1.default.createServer(() => { });
        this._io = socket_io_1.default(this._http);
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
    stop() {
        const { _io, _http } = this;
        if (_io) {
            _io.close();
        }
        if (_http) {
            _http.close();
        }
    }
}
exports.default = Context;
;

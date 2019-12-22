"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const electron_1 = require("electron");
const socket_io_client_1 = tslib_1.__importDefault(require("socket.io-client"));
const require_at_1 = tslib_1.__importDefault(require("require-at"));
const path_1 = tslib_1.__importDefault(require("path"));
const util_1 = require("util");
const port = process.argv[2];
const requirePath = process.argv[3];
if (!port) {
    process.exit(1);
}
const _require = require;
require = require_at_1.default(requirePath);
const socket = socket_io_client_1.default(`http://localhost:${port}/`);
try {
    electron_1.app.on('ready', () => {
        const window = new electron_1.BrowserWindow({
            show: true,
            webPreferences: {
                devTools: true,
                preload: path_1.default.resolve(__dirname, './preload.js'),
                safeDialogs: true,
                disableHtmlFullscreenWindowResize: true,
                additionalArguments: [requirePath],
                defaultEncoding: 'utf-8',
            },
        });
        socket.on('host:eval', (fn, id, ...params) => {
            try {
                Promise.resolve(eval(fn)(...params))
                    .then(res => {
                    socket.emit(`done:${id}`, 'then', res);
                })
                    .catch(err => {
                    socket.emit(`done:${id}`, 'catch', err);
                });
            }
            catch (e) {
                socket.emit('error', e);
            }
        });
        const cl = console.log;
        const ce = console.error;
        const ci = console.info;
        const cw = console.warn;
        console.log = (...data) => {
            socket.emit('info', `host -> ${util_1.inspect(data)}`);
            return cl(...data);
        };
        console.error = (...data) => {
            socket.emit('error', `host -> ${util_1.inspect(data)}`);
            return ce(...data);
        };
        console.info = (...data) => {
            socket.emit('info', `host -> ${util_1.inspect(data)}`);
            return ci(...data);
        };
        console.warn = (...data) => {
            socket.emit('warning', `host -> ${util_1.inspect(data)}`);
            return cw(...data);
        };
        electron_1.ipcMain.on('info', (e, message) => {
            socket.emit('info', message);
        });
        electron_1.ipcMain.on('error', (e, message) => {
            socket.emit('error', message);
        });
        electron_1.ipcMain.on('warning', (e, message) => {
            socket.emit('warning', message);
        });
        electron_1.ipcMain.on('critical', (e, message) => {
            socket.emit('critical', message);
        });
        socket.on('client:eval', (fn, id, ...params) => {
            window.webContents.send('eval', fn, id, ...params);
            electron_1.ipcMain.once(`done:${id}`, (e, type, ...data) => {
                socket.emit(`done:${id}`, type, ...data);
            });
        });
    });
    electron_1.app.on('window-all-closed', () => {
        socket.emit('error', 'windows closed');
        process.exit(0);
    });
}
catch (e) {
    socket.emit('error', e);
}
process.on('beforeExit', code => {
    if (code !== 0) {
        socket.emit('error', 'host process has been closed with non-zero code');
    }
});

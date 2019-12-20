"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const electron_1 = require("electron");
const socket_io_client_1 = tslib_1.__importDefault(require("socket.io-client"));
const path_1 = tslib_1.__importDefault(require("path"));
const port = process.argv[2];
if (!port) {
    process.exit(1);
}
const socket = socket_io_client_1.default(`http://localhost:${port}/`);
electron_1.app.on('ready', () => {
    const win = new electron_1.BrowserWindow({
        show: true,
        webPreferences: {
            devTools: true,
            preload: path_1.default.resolve(__dirname, './preload.js'),
        },
    });
    socket.on('host:eval', (fn, param) => {
        try {
            Promise.resolve(eval(fn)({
                window: win,
                webContents: win.webContents,
            }, param))
                .then(res => {
                socket.emit('done', res);
            })
                .catch(err => {
                socket.emit('error', err);
            });
        }
        catch (e) {
            socket.emit('done');
        }
    });
    socket.on('client:eval', (fn, param) => {
        win.webContents.send('eval', fn, param);
    });
    electron_1.ipcMain.on('done', (e, res) => {
        socket.emit('done', res);
    });
    electron_1.ipcMain.on('error', (e, res) => {
        socket.emit('error', res);
    });
});
electron_1.app.on('window-all-closed', () => {
    socket.disconnect();
    process.exit(0);
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.ipcRenderer.on('eval', (e, fn, param) => {
    try {
        Promise.resolve(eval(fn)({
            window,
            document,
        }, param))
            .then(res => {
            electron_1.ipcRenderer.send('done', res);
        })
            .catch(err => {
            electron_1.ipcRenderer.send('error', err);
        });
    }
    catch (er) {
        electron_1.ipcRenderer.send('done', er);
    }
});

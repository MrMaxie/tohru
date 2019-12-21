import { app, BrowserWindow as Browser, ipcMain as ipc } from 'electron';
import io from 'socket.io-client';
import path from 'path';

const port = process.argv[2];

if (!port) {
    process.exit(1);
}

const socket = io(`http://localhost:${port}/`);

app.on('ready', () => {
    const win = new Browser({
        show: true,
        webPreferences: {
            devTools: true,
            preload: path.resolve(__dirname, './preload.js'),
        },
    });

    socket.on('host:eval', (fn: string, param: any) => {
        try {
            Promise.resolve(eval(fn)({
                app,
                window: win,
                webContents: win.webContents,
            }, param))
                .then(res => {
                    socket.emit('done', res);
                })
                .catch(err => {
                    socket.emit('error', err);
                });
        } catch (e) {
            socket.emit('done');
        }
    });

    socket.on('client:eval', (fn: string, param: any) => {
        win.webContents.send('eval', fn, param);
    });

    ipc.on('done', (e, res) => {
        socket.emit('done', res);
    });

    ipc.on('error', (e, res) => {
        socket.emit('error', res);
    });
});

app.on('window-all-closed', () => {
    socket.disconnect();
    process.exit(0);
});

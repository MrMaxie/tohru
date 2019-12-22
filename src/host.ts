import { app, BrowserWindow as Browser, ipcMain as ipc } from 'electron';
import io from 'socket.io-client';
import requireAt from 'require-at';
import path from 'path';
import { inspect } from 'util';

const port = process.argv[2];
const requirePath = process.argv[3];

if (!port) {
    process.exit(1);
}

const _require = require;
require = requireAt(requirePath);

const socket = io(`http://localhost:${port}/`);

try {
    app.on('ready', () => {
        const window = new Browser({
            show: true,
            webPreferences: {
                devTools: true,
                preload: path.resolve(__dirname, './preload.js'),
                safeDialogs: true,
                disableHtmlFullscreenWindowResize: true,
                additionalArguments: [requirePath],
                defaultEncoding: 'utf-8',
            },
        });

        socket.on('host:eval', (fn: string, id: number, ...params: any[]) => {
            try {
                Promise.resolve(eval(fn)(...params))
                    .then(res => {
                        socket.emit(`done:${id}`, 'then', res);
                    })
                    .catch(err => {
                        socket.emit(`done:${id}`, 'catch', err);
                    });
            } catch (e) {
                socket.emit('error', e);
            }
        });

        const cl = console.log;
        const ce = console.error;
        const ci = console.info;
        const cw = console.warn;

        console.log = (...data: any) => {
            socket.emit('info', `host -> ${inspect(data)}`);
            return cl(...data);
        };

        console.error = (...data: any) => {
            socket.emit('error', `host -> ${inspect(data)}`);
            return ce(...data);
        };

        console.info = (...data: any) => {
            socket.emit('info', `host -> ${inspect(data)}`);
            return ci(...data);
        };

        console.warn = (...data: any) => {
            socket.emit('warning', `host -> ${inspect(data)}`);
            return cw(...data);
        };

        ipc.on('info', (e, message: string) => {
            socket.emit('info', message);
        });

        ipc.on('error', (e, message: string) => {
            socket.emit('error', message);
        });

        ipc.on('warning', (e, message: string) => {
            socket.emit('warning', message);
        });

        ipc.on('critical', (e, message: string) => {
            socket.emit('critical', message);
        });

        socket.on('client:eval', (fn: string, id: number, ...params: any[]) => {
            window.webContents.send('eval', fn, id, ...params);

            ipc.once(`done:${id}`, (e, type: 'then' | 'catch', ...data: any[]) => {
                socket.emit(`done:${id}`, type, ...data);
            });
        });
    });

    app.on('window-all-closed', () => {
        socket.emit('error', 'windows closed');
        process.exit(0);
    });
} catch (e) {
    socket.emit('error', e);
}

process.on('beforeExit', code => {
    if (code !== 0) {
        socket.emit('error', 'host process has been closed with non-zero code');
    }
});

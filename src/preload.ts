import { ipcRenderer as ipc } from 'electron';
import requireAt from 'require-at';
import { inspect } from 'util';

const requirePath = process.argv.pop();
const _require = require;

try {
    require = requireAt(requirePath);
} catch (e) {
    ipc.send('error', `browser -> ${e.message}`);
}

const cl = console.log;
const ce = console.error;
const ci = console.info;
const cw = console.warn;

console.log = (...data: any[]) => {
    if (data.length > 0 && /Electron Security Warning/.test(data[0])) {
        return;
    }
    ipc.send('info', `browser -> ${inspect(data)}`);
    return cl(...data);
};

console.error = (...data: any[]) => {
    if (data.length > 0 && /Electron Security Warning/.test(data[0])) {
        return;
    }
    ipc.send('error', `browser -> ${inspect(data)}`);
    return ce(...data);
};

console.info = (...data: any[]) => {
    if (data.length > 0 && /Electron Security Warning/.test(data[0])) {
        return;
    }
    ipc.send('info', `browser -> ${inspect(data)}`);
    return ci(...data);
};

console.warn = (...data: any[]) => {
    if (data.length > 0 && /Electron Security Warning/.test(data[0])) {
        return;
    }
    ipc.send('warning', `browser -> ${inspect(data)}`);
    return cw(...data);
};

window.addEventListener('error', e => {
    console.error('error', e.message);
});

ipc.on('eval', (e, fn: string, id: number, ...params: any[]) => {
    try {
        Promise.resolve(eval(fn)(...params))
            .then((...res) => {
                ipc.send(`done:${id}`, 'then', ...res);
            })
            .catch((...err) => {
                ipc.send(`done:${id}`, 'then', ...err);
            });
    } catch (err) {
        ipc.send('critical', err);
    }
});


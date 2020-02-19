var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const require_at_1 = __importDefault(require("require-at"));
const util_1 = require("util");
const requirePath = process.argv.pop();
const _require = require;
try {
    require = require_at_1.default(requirePath);
}
catch (e) {
    electron_1.ipcRenderer.send('error', `browser -> ${e.message}`);
}
const cl = console.log;
const ce = console.error;
const ci = console.info;
const cw = console.warn;
console.log = (...data) => {
    if (data.length > 0 && /Electron Security Warning/.test(data[0])) {
        return;
    }
    electron_1.ipcRenderer.send('info', `browser -> ${util_1.inspect(data)}`);
    return cl(...data);
};
console.error = (...data) => {
    if (data.length > 0 && /Electron Security Warning/.test(data[0])) {
        return;
    }
    electron_1.ipcRenderer.send('error', `browser -> ${util_1.inspect(data)}`);
    return ce(...data);
};
console.info = (...data) => {
    if (data.length > 0 && /Electron Security Warning/.test(data[0])) {
        return;
    }
    electron_1.ipcRenderer.send('info', `browser -> ${util_1.inspect(data)}`);
    return ci(...data);
};
console.warn = (...data) => {
    if (data.length > 0 && /Electron Security Warning/.test(data[0])) {
        return;
    }
    electron_1.ipcRenderer.send('warning', `browser -> ${util_1.inspect(data)}`);
    return cw(...data);
};
window.addEventListener('error', e => {
    console.error('error', e.message);
});
electron_1.ipcRenderer.on('eval', (e, fn, id, ...params) => {
    try {
        Promise.resolve(eval(fn)(...params))
            .then((...res) => {
            electron_1.ipcRenderer.send(`done:${id}`, 'then', ...res);
        })
            .catch((...err) => {
            electron_1.ipcRenderer.send(`done:${id}`, 'then', ...err);
        });
    }
    catch (err) {
        electron_1.ipcRenderer.send('critical', err);
    }
});

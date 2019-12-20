import { ipcRenderer as ipc } from 'electron';

ipc.on('eval', (e, fn: string, param?: any) => {
    try {
        Promise.resolve(eval(fn)({
            window,
            document,
        }, param))
            .then(res => {
                ipc.send('done', res);
            })
            .catch(err => {
                ipc.send('error', err);
            });
    } catch (er) {
        ipc.send('done', er);
    }
});


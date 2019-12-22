const electron = require('electron');
const { Tohru } = require('./dist/main');

Tohru({
    electron,
    logLevel: 0,
    timeout: 60000 * 10,
})
    .goto('https://github.com/')
    .wait(1000)
    .goto('https://google.com/')
    .wait('input[name="q"]')
    .type('input[name="q"]', 'Github MrMaxie')
    .wait(2000)
    .end();

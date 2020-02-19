const electron = require('electron');
const { Tohru } = require('./dist/main');

Tohru({
    electron,
    timeout: 10000,
})
    .goto('https://github.com/')
    .wait(1000)
    .goto('https://google.com/')
    .wait('input[name="q"]')
    .type('input[name="q"]', 'Github MrMaxie')
    .wait(2000)
    .click('[type="submit"]')
    .wait()
    .end();

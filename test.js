const electron = require('electron');
const { Tohru } = require('./dist/main');

Tohru({ electron })
    .goto('https://github.com/')
    .wait(1000)
    .goto('https://google.com/')
    .wait('input[name="q"]')
    .type('input[name="q"]', 'Github MrMaxie')
    .wait(2000)
    .end();

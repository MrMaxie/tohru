const electron = require('electron');
const { Tohru } = require('./dist/main');

Tohru({
    electron,
    logLevel: 0,
    timeout: 10000,
    defaultLogger: true,
})
    .procedure('test2', p => {
        p
            .goto('https://youtube.com/')
            .wait(2000)
            .goto('https://deviantart.com/')
            .wait(2000)
            .goto('https://wallhaven.cc/')
            .wait(2000)
    })
    .test2()
    .action('test', () => {
        console.log('test!');
    })
    .test()
    .goto('https://github.com/')
    .wait(1000)
    .goto('https://google.com/')
    .wait('input[name="q"]')
    .type('input[name="q"]', 'Github MrMaxie')
    .wait(2000)
    .click('[type="submit"]')
    .test2()
    .end();

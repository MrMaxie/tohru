const electron = require('electron');
const { Tohru } = require('./dist/main');

const t = Tohru({
    electron,
    logLevel: 0,
    timeout: 10000,
    defaultLogger: true,
});

console.log(t.action.toString());

t
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
    .wait()
    .end();

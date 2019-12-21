![Tohru](assets/tohru.gif)

# Tohru

Extendable Electron flow designer. Tool allowing in easy way inject and run code in Electron.

# Why this library exists?

- Sadly, NightmareJS is very bugged
- Most of this kind tools have **huge** API which it's hard to reuse and fit to mine scripts
- Wrapping all possible actions is impossible and preparing such wrappers consume time and need changes in multiple files even for that simplest one

# Goals

- Pluginable and easy to hack API, to allow for even most edgy cases
- Getting easily context of Electron's host, Electron's browser and Tohru itself
- Queueable flow with hard and soft crashes
- Way to catch each type of result
- Uses Electron executable of user choice
- Contains a lot of love ❤️

# Getting started

Install Tohru and Electron:

```bash
npm install --save tohru electron
# or
yarn add tohru electron
```

Set-up your code, simplest example:

```javascript
const Tohru = require('tohru');
// Outside of Electron's processes will return string with path of Electron
const electron = require('electron');

Tohru({ electron })
    .goto('https://google.com/')
    .wait('[name="q"]')
    .type('[name="q"]', 'My awesome query')
    .submit('form')
    .wait(1000)
    .end();
```

Enjoy browser automation!

# API

API base on actions model, flow of this model looks like this:

1. Register action - which will prepare initializer and action itself.
2. Use registered action with needed arguments.
3. Tohru will add this action into queue, and will run it after previously actions.

## Actions

Actions are registered only in one instance of Tohru at the same time, so if you need to run those actions in multiple instances, you will need to prepare setup function. Registering such action looks like this:

```javascript
tohruInstance.action('actionName', (context, params) => {
    // Here execute and return some async action or do whatever you need
});
```

So for example `.waitSomeTime` action can looks lioke this:

```javascript
tohruInstance.action('waitSomeTime', (context, params) => {
    return new Promise(res => {
        setTimeout(res, 1000);
    });
});

// then you can use it:

tohruInstance
    .goto('https://goole.com/')
    .waitSomeTime()
    .end();
```

Ok, but if you want to get two arguments: time and callback:

```javascript
tohruInstance.action('waitSomeTime', (context, params) => {
    return new Promise(res => {
        setTimeout(() => {
            res();
            params[1]();
        }, params[0]);
    });
});

// then you can use it:

tohruInstance
    .goto('https://goole.com/')
    .waitSomeTime(1000, () => {
        console.log('hello after 1000ms :D');
    })
    .end();
```

In all those examples is also context, which is descibed below.

## Context

It's most magic thing in whole project. Allows you to eval (yes, it's this prohibited function) code inside of Electron "host" and Browser window aka "client". So let's hack!

- `hostEval(cb, params)`

Allows you to execute code inside of host. Example usage looks like this:

```javascript
ctx.hostEval(({ window, webContents }, url) => {
    window.loadURL(url);

    return new Promise(res => {
        webContents.once('dom-ready', res);
    });
}, 'https://google.com/');
```

- `clientEval(cb, params)`

Allows you to execute code inside of client. Example usage looks like this:

```javascript
ctx.clientEval(({ document }) => {
    return new Promise((res, rej) => {
        document.querySelector(target) ? res() : rej();
    });
});
```

In both cases you can to send 1-2 arguments:

1. Function that will be changed into string and send to host that's why you don't have possibility pass variables thru JS itself.
2. Optional argument which allows you to pass those needed argument for receiever.

**How to operate on such a limited scope?**

```javascript
const x1 = 10;
const x2 = 20;
const x3 = 30;
const x4 = 40;

let y1 = 10;
let y2 = null;
let y3 = null;

const p1 = ctx.clientEval((ctx, [ x2, x3 ]) => {
    console.log(ctx); // ClientContext described below
    console.log(x1); // => undefined
    console.log(x2); // => 20
    console.log(x3); // => undefined
    console.log(x4); // => 30
    y1 += 10; // => Uncaught ReferenceError: y1 is not defined
    return 20;
}, [ x2, x4 ]).then(result => {
    y2 = result;
});

const p2 = ctx.hostEval((ctx, [ x2, x3 ]) => {
    console.log(ctx); // HostContext described below
    console.log(x1); // => undefined
    console.log(x2); // => 10
    console.log(x3); // => undefined
    console.log(x4); // => 30
    y1 += 10; // => Uncaught ReferenceError: y1 is not defined
    return 30;
}, [ x1, x4 ]).then(result => {
    y3 = result;
});

Promise.all([p1, p2]).then(() => {
    console.log(y1); // => 10
    console.log(y2); // => 20
    console.log(y3); // => 30
});
```

## HostContext

You have full access for all global things, for example `process`, `require` etc., but if you want to get those values, get them from context:

- app - `Electron.App` object
- window - `Electron.BrowserWindow` object
- webContents - `Electron.WebContents` object from above window

## ClientContext

You have full access for all global things, for example `document`, `window` etc., but if you want to get those values, get them from context:

- ... 😞 this list is empty at this moment, I don't know what can I expose here

## I want to `require()` library X or file Y from my project inside of host/browser

Inside both contextes `require()` will try to find modules inside of your project directory or from your project's root directory.

Real `require()` is moved to `__require()`, so don't worry.

# Licence

This project is licensed under the Apache-2.0 license - see the LICENSE.md file for details

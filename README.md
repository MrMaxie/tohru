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

## Instance

Tohru instance can be only created via exported function

```javascript
// ES6+ or TypeScript
import { Tohru } from 'tohru';
// ES5
const Tohru = require('tohru');

const tohruInstance = Tohru({
    // settings
});
```

Every action returns actions list, so you can to make chain

## Settings

Settings can contains given properties:
- `electron: string` - electron executable path
- `tickRate?: number` - time in ms between actions, default: `500`
- `timeout?: number` - time in ms how long every action can work, after that time error will be thrown, default: `10000`
- `typeInterval?: number` - time in ms how long `.type()` should wait before firing each key, default: `100`
- `pollInterval?: number` - time in ms how long `.wait()` should wait before each searching, default: `50`
- `logLevel?: LogLevels` - level of reporting, all equal and higher messages will be reported, default: `3`
  - `5` - None
  - `4` - Critical
  - `3` - Error
  - `2` - Warning
  - `1` - Info
  - `0` - Debug
- `defaultLogger?: boolean` - if true Tohru will setup inner logger for loggin purposes, default: `false`
- `requirePath?: string` - directory of your project, this path will be used to run `require` from your project, default: `process.cwd()`

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

## Internal Actions

Few actions are registered at start of Tohru. Some of those actions are prepared, some are protected.

- `then(cb)` **(protected)** - setup callback function that will be runned once when queue of actions will be empty
  - `cb: () => void` - callback
- `catch(cb)` **(protected)** - setup callback function that will be runned once when critical error occurs
  - `cb: (message: string) => void` - callback
- `end()` **(protected)** - closes all browsers and servers attached to this tohru instance
- `action(name, cb)` **(protected)** - push new action
  - `name: string` - unique name of action
  - `cb: (...params) => any` - callback with params of your choice and return promise-like or just plain value
- `goto(url)` - redirects to given path
  - `url: string`
- `type(selector, text)` - simulates human-way of typing text
  - `selector: string` - selector, target of events
  - `text: string`
- `wait(target)` - waits until given selector will be available or given time in ms
  - `target: string | number` - selector string or time in ms

## Context

It's most magic thing in whole project. Allows you to eval (yes, it's this prohibited function) code inside of Electron "host" and Browser window aka "client". So let's hack!

### `host(cb:, ...params) => Promise<unknown>`

Allows you to execute code inside of host, and returns promise. Inside of callback you have access to host scope, so given variables are available:

- `app` - `Electron.App` object
- `window` - `Electron.BrowserWindow` object
- `require` - function allowing you to require like in your project

Example usage looks like this:

```javascript
tohruInstance.action('someAction', ctx => {
    return ctx.host(url => {
        window.loadURL(url);

        return new Promise(res => {
            webContents.once('dom-ready', res);
        });
    }, 'https://google.com/');
});
```

### `client(cb, ...params) => Promise<unknown>`

Allows you to execute code inside of client, and returns promise. Inside of callback you have access to browser scope, so you can to use all objects like `window`, `document` etc., additionaly there are `require` which allows you to require like in your project. Example usage looks like this:

```javascript
tohruInstance.action('someAction', ctx => {
    return ctx.client(target => {
        return new Promise((res, rej) => {
            document.querySelector(target) ? res() : rej();
        });
    }, '.button');
});
```

### How it works?

First argument have to be function that will be changed into string and send to host that's why you don't have possibility pass variables thru JS itself.

All next arguments are optional, they allow you to pass variables to host/client scope. They will be used to execute your function from first argument in the same order.

### How to operate on such a limited scope?

Here you have little example, how it works:

```javascript
const x1 = 10;
const x2 = 20;
const x3 = 30;
const x4 = 40;

let y1 = 10;
let y2 = null;
let y3 = null;

const p1 = ctx.clientEval(([ x2, x3 ], x1) => {
    console.log(x1); // => 30
    console.log(x2); // => 20
    console.log(x3); // => 40
    console.log(x4); // => undefined
    y1 += 10; // => Uncaught ReferenceError: y1 is not defined
    return 20;
}, [ x2, x4 ], x3).then(result => {
    y2 = result;
});

const p2 = ctx.hostEval(([ x2, x3 ], x4) => {
    console.log(x1); // => undefined
    console.log(x2); // => 10
    console.log(x3); // => 40
    console.log(x4); // => 30
    y1 += 10; // => Uncaught ReferenceError: y1 is not defined
    return 30;
}, [ x1, x4 ], x3).then(result => {
    y3 = result;
});

Promise.all([p1, p2]).then(() => {
    console.log(y1); // => 10
    console.log(y2); // => 20
    console.log(y3); // => 30
});
```

### I want to `require()` library X or file Y from my project inside of host/browser

Inside both contextes `require()` will try to find modules inside of your project directory or from your project's root directory.

Real `require()` is moved to `_require()`, so don't worry.

# Licence

This project is licensed under the Apache-2.0 license - see the LICENSE.md file for details

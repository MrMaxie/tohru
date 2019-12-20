![Tohru](assets/tohru.gif)

# Tohru
Extendable Electron flow designer. Tool allowing in easy way inject and run code in Electron.

# Why it exists?
- NightmareJS is very bugged
- Most of this kind tools have **huge** API which it's hard to reuse and fit to mine scripts

# Goals
- Pluginable and easy to hack API
- Getting easily context of Electron host, and Electron's browser
- "Queueable" flow with hard and soft crashes
- Uses version of Electron from user
- Contains a lot of love ❤️

# Getting started

Example code looks like this:

```javascript
const Tohru = require('tohru');
const electron = require('electron'); // Outside of Electron's processes will return string

Tohru({ electron })
    .goto('https://example.com/')
    .end();
```

# API

## Actions

WIP

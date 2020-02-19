var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = __importDefault(require("events"));
const util_1 = require("util");
var Level;
(function (Level) {
    Level[Level["None"] = 5] = "None";
    Level[Level["Critical"] = 4] = "Critical";
    Level[Level["Error"] = 3] = "Error";
    Level[Level["Warning"] = 2] = "Warning";
    Level[Level["Info"] = 1] = "Info";
    Level[Level["Debug"] = 0] = "Debug";
})(Level = exports.Level || (exports.Level = {}));
;
const LevelName = {
    [Level.None]: 'none',
    [Level.Critical]: 'crit',
    [Level.Error]: 'error',
    [Level.Warning]: 'warn',
    [Level.Info]: 'info',
    [Level.Debug]: 'debug',
};
const TermColor = {
    Black: '\x1b[30m',
    Red: '\x1b[31m',
    Green: '\x1b[32m',
    Yellow: '\x1b[33m',
    Blue: '\x1b[34m',
    Magenta: '\x1b[35m',
    Cyan: '\x1b[36m',
    White: '\x1b[97m',
    Reset: '\x1b[39m',
    Gray: '\x1b[90m',
};
const LevelColor = {
    [Level.None]: TermColor.Black,
    [Level.Critical]: TermColor.Red,
    [Level.Error]: TermColor.Yellow,
    [Level.Warning]: TermColor.Magenta,
    [Level.Info]: TermColor.Blue,
    [Level.Debug]: TermColor.Green,
};
class Logger extends events_1.default {
    constructor() {
        super(...arguments);
        this.level = Level.Error;
        this.throwLevel = Level.Critical;
    }
    setLevel(level) {
        this.level = level;
    }
    setThrowLevel(level) {
        this.throwLevel = level;
    }
    getName(level) {
        return LevelName[level];
    }
    log(type, message, ...args) {
        if (type === Level.None) {
            return;
        }
        if (type >= this.throwLevel) {
            throw new Error(this.formatWoColors(message, ...args));
        }
        if (type < this.level) {
            return;
        }
        this.emit('logLeveled', type, message, ...args);
        this.emit('log', this.getName(type), message, ...args);
    }
    critical(message, ...args) {
        this.log(Level.Critical, message, ...args);
    }
    error(message, ...args) {
        this.log(Level.Error, message, ...args);
    }
    warning(message, ...args) {
        this.log(Level.Warning, message, ...args);
    }
    info(message, ...args) {
        this.log(Level.Info, message, ...args);
    }
    debug(message, ...args) {
        this.log(Level.Debug, message, ...args);
    }
    startDefaultLogger() {
        this.on('logLeveled', (type, message) => {
            console.log([
                TermColor.Gray,
                '\[',
                LevelColor[type],
                this.getName(type).toUpperCase(),
                TermColor.Reset,
                TermColor.Gray,
                '\]',
                TermColor.Reset,
                '\t',
                message,
            ].join(''));
        });
    }
    format(message, ...args) {
        return util_1.format(message, ...args.map(x => util_1.inspect(x, false, 3, true)));
    }
    formatWoColors(message, ...args) {
        return util_1.format(message, ...args.map(x => util_1.inspect(x, false, 3, false)));
    }
}
exports.default = Logger;

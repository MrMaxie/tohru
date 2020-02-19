import EventEmitter from 'events';
import { inspect, format } from 'util';

export enum Level {
    None = 5,
    Critical = 4,
    Error = 3,
    Warning = 2,
    Info = 1,
    Debug = 0,
};

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

export default class Logger extends EventEmitter {
    level: Level = Level.Error;

    throwLevel: Level = Level.Critical;

    setLevel(level: Level) {
        this.level = level;
    }

    setThrowLevel(level: Level) {
        this.throwLevel = level;
    }

    getName(level: Level) {
        return LevelName[level];
    }

    log(type: Level, message: string, ...args: any[]) {
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

    critical(message: string, ...args: any[]) {
        this.log(Level.Critical, message, ...args);
    }

    error(message: string, ...args: any[]) {
        this.log(Level.Error, message, ...args);
    }

    warning(message: string, ...args: any[]) {
        this.log(Level.Warning, message, ...args);
    }

    info(message: string, ...args: any[]) {
        this.log(Level.Info, message, ...args);
    }

    debug(message: string, ...args: any[]) {
        this.log(Level.Debug, message, ...args);
    }

    startDefaultLogger() {
        this.on('logLeveled', (type: Level, message: string) => {
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

    format(message: string, ...args: any[]) {
        return format(message, ...args.map(x => inspect(x, false, 3, true)));
    }

    formatWoColors(message: string, ...args: any[]) {
        return format(message, ...args.map(x => inspect(x, false, 3, false)));
    }
}

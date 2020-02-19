/// <reference types="node" />
import EventEmitter from 'events';
export declare enum Level {
    None = 5,
    Critical = 4,
    Error = 3,
    Warning = 2,
    Info = 1,
    Debug = 0
}
export default class Logger extends EventEmitter {
    level: Level;
    throwLevel: Level;
    setLevel(level: Level): void;
    setThrowLevel(level: Level): void;
    getName(level: Level): string;
    log(type: Level, message: string, ...args: any[]): void;
    critical(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    warning(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    debug(message: string, ...args: any[]): void;
    startDefaultLogger(): void;
    format(message: string, ...args: any[]): string;
    formatWoColors(message: string, ...args: any[]): string;
}

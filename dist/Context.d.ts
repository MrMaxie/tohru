/// <reference types="node" />
import EventEmitter from 'events';
import { BrowserWindow, WebContents } from 'electron';
export declare type HostContext = {
    window: BrowserWindow;
    webContents: WebContents;
};
export declare type ClientContext = {
    document: Document;
    window: Window;
};
export default class Context extends EventEmitter {
    private _http;
    private _io;
    start(port: number): void;
    hostEval: <T extends any>(fn: (context: HostContext, param: T) => any, param?: T) => Promise<unknown>;
    clientEval: <T extends any>(fn: (context: ClientContext, param: T) => any, param?: T) => Promise<unknown>;
    private _eval;
    private _prepareFn;
    stop(): void;
}

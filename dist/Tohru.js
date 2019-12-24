"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Logger_1 = tslib_1.__importStar(require("./Logger"));
const Browser_1 = tslib_1.__importDefault(require("./Browser"));
const Queue_1 = tslib_1.__importDefault(require("./Queue"));
exports.default = (options) => {
    const _options = Object.assign({
        tickRate: 500,
        timeout: 10000,
        typeInterval: 100,
        pollInterval: 50,
        logLevel: Logger_1.Level.Error,
        defaultLogger: false,
        requirePath: process.cwd(),
    }, options);
    const logger = new Logger_1.default();
    logger.setLevel(_options.logLevel);
    if (_options.defaultLogger) {
        logger.startDefaultLogger();
    }
    const browser = new Browser_1.default(logger, _options.electron, _options.requirePath);
    const queue = new Queue_1.default(logger, browser, _options);
    return queue.actions;
};

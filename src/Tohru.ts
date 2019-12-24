import Logger, { Level } from './Logger';
import Browser from './Browser';
import Queue from './Queue';

export type TohruOptions = {
    electron: string;
    tickRate?: number;
    timeout?: number;
    typeInterval?: number;
    pollInterval?: number;
    logLevel?: Level;
    defaultLogger?: boolean;
    requirePath?: string;
};

export default (options: TohruOptions) => {
    const _options = Object.assign({
        tickRate: 500,
        timeout: 10000,
        typeInterval: 100,
        pollInterval: 50,
        logLevel: Level.Error,
        defaultLogger: false,
        requirePath: process.cwd(),
    }, options) as Required<TohruOptions>;

    const logger = new Logger();

    logger.setLevel(_options.logLevel);

    if (_options.defaultLogger) {
        logger.startDefaultLogger();
    }

    const browser = new Browser(
        logger,
        _options.electron,
        _options.requirePath,
    );

    const queue = new Queue(logger, browser, _options);

    return queue.actions;
}

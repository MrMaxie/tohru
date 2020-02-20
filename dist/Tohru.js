var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Logger_1 = __importStar(require("./Logger"));
const Browser_1 = __importDefault(require("./Browser"));
const Queue_1 = __importDefault(require("./Queue"));
exports.default = (options) => {
    const _options = Object.assign({
        tickRate: 500,
        timeout: 10000,
        typeInterval: 100,
        pollInterval: 50,
        logLevel: Logger_1.Level.Error,
        throwLevel: Logger_1.Level.Critical,
        defaultLogger: false,
        requirePath: process.cwd(),
        assetsPath: process.cwd(),
    }, options);
    const logger = new Logger_1.default();
    logger.setLevel(_options.logLevel);
    logger.setThrowLevel(_options.throwLevel);
    if (_options.defaultLogger) {
        logger.startDefaultLogger();
    }
    const browser = new Browser_1.default(logger, _options.electron, _options.requirePath);
    const queue = new Queue_1.default(logger, browser, _options);
    return queue.getPalette();
};

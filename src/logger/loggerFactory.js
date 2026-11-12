const fs = require("fs");
const path = require("path");
const winston = require("winston");

const { getRequestContext } = require("@src/helper/requestContext.js");
const DailyRotate = require("@src/logger/dailyRotate.js");

const buildLogFormat = ({ requestContextEnabled = true } = {}) => {
    const enrichContext = winston.format((info) => {
        if (!requestContextEnabled) return info;

        const context = getRequestContext();
        if (context) info.context = context;
        return info;
    });

    return winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        enrichContext(),
        winston.format.printf(({ timestamp, level, message, context, ...metadata }) => {
            const detail = {
                ...(context ?? {}),
                ...metadata,
            };
            const suffix = Object.keys(detail).length > 0 ? ` ${JSON.stringify(detail)}` : "";
            const normalizedMessage = typeof message === "object" ? JSON.stringify(message) : message;
            return `[${timestamp}] ${level.toUpperCase()}: ${normalizedMessage}${suffix}`;
        }),
    );
};

const buildFileTransportOptions = ({ level, filename, retentionDays = 0, watchLog = true }) => ({
    level,
    filename,
    datePattern: "YYYY-MM-DD",
    watchLog,
    ...(retentionDays > 0 ? { maxFiles: `${retentionDays}d` } : {}),
});

const createLogger = ({
    level = "info",
    filename,
    retentionDays = 0,
    consoleEnabled = false,
    requestContextEnabled = true,
    fileEnabled = true,
    watchLog = true,
}) => {
    const transports = [];

    if (fileEnabled) {
        if (!filename) throw new Error("啟用檔案日誌時必須提供 filename");
        fs.mkdirSync(path.dirname(filename), { recursive: true });
        transports.push(new DailyRotate(buildFileTransportOptions({ level, filename, retentionDays, watchLog })));
    }

    if (consoleEnabled) {
        transports.push(new winston.transports.Console({ level }));
    }

    return winston.createLogger({
        level,
        format: buildLogFormat({ requestContextEnabled }),
        transports,
        silent: transports.length === 0,
    });
};

module.exports = {
    buildFileTransportOptions,
    buildLogFormat,
    createLogger,
};

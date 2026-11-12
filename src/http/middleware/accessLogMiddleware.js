const accessLogger = require("@src/logger/instance/accessLogger.js");

const accessLogMiddleware = (req, res, next) => {
    const startedAt = Date.now();
    res.on("finish", () => {
        accessLogger.info("HTTP 請求完成", {
            httpCode: res.statusCode,
            durationMs: Date.now() - startedAt,
        });
    });
    return next();
};

module.exports = { accessLogMiddleware };


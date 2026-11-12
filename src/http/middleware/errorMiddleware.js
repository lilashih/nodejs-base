const AppError = require("@src/error/appError.js");
const logger = require("@src/logger/instance/appLogger.js");
const response = require("@src/http/common/response.js");

const errorMiddleware = (error, req, res, next) => {
    if (res.headersSent) return next(error);

    let normalizedError;

    if (error instanceof AppError) {
        normalizedError = {
            httpCode: error.httpCode,
            message: error.message,
            data: error.data,
        };
    } else if (error.code === "ER_DUP_ENTRY" || error.code === "SQLITE_CONSTRAINT_UNIQUE"
        || error.errcode === 2067) {
        normalizedError = {
            httpCode: 409,
            message: "資料已存在",
            data: {},
        };
    } else {
        normalizedError = {
            httpCode: 500,
            message: "系統發生錯誤",
            data: {},
        };
    }

    if (normalizedError.httpCode >= 500) {
        logger.error("未預期的系統錯誤", {
            errorName: error.name,
            errorMessage: error.message,
            code: error.code,
            stack: error.stack,
        });
        normalizedError.message = "系統發生錯誤";
        normalizedError.data = {};
    }

    return response.error(res, normalizedError);
};

module.exports = { errorMiddleware };

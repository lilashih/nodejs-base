const AppError = require("@src/error/appError.js");

class ConflictError extends AppError {
    constructor(message = "資料已存在", data = {}) {
        super(message, { httpCode: 409, data });
    }
}

module.exports = ConflictError;

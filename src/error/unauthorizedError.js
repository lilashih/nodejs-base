const AppError = require("@src/error/appError.js");

class UnauthorizedError extends AppError {
    constructor(message = "請先登入", data = {}) {
        super(message, { httpCode: 401, data });
    }
}

module.exports = UnauthorizedError;

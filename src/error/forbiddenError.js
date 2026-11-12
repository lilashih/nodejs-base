const AppError = require("@src/error/appError.js");

class ForbiddenError extends AppError {
    constructor(message = "沒有操作權限", data = {}) {
        super(message, { httpCode: 403, data });
    }
}

module.exports = ForbiddenError;

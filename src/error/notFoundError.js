const AppError = require("@src/error/appError.js");

class NotFoundError extends AppError {
    constructor(name = "資料", data = {}) {
        super(`查無該${name}`, { httpCode: 404, data });
    }
}

module.exports = NotFoundError;

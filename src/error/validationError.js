const AppError = require("@src/error/appError.js");

class ValidationError extends AppError {
    constructor(errors) {
        super("輸入資料有誤", { httpCode: 422, data: { errors } });
    }
}

module.exports = ValidationError;

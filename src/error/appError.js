class AppError extends Error {
    constructor(message, { httpCode = 400, data = {}, cause } = {}) {
        if (!Number.isInteger(httpCode) || httpCode < 400 || httpCode > 599) {
            throw new TypeError("httpCode 必須是 400 至 599 的整數");
        }

        super(message, { cause });
        this.name = this.constructor.name;
        this.httpCode = httpCode;
        this.data = data;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;

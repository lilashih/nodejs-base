const NotFoundError = require("@src/error/notFoundError.js");

const notFoundMiddleware = (req, res, next) => {
    return next(new NotFoundError("路徑"));
};

module.exports = { notFoundMiddleware };

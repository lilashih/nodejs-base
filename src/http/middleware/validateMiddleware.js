const { matchedData, validationResult } = require("express-validator");
const ValidationError = require("@src/error/validationError.js");

const validationFormatter = validationResult.withDefaults({
    formatter: (error) => ({ name: error.path, message: error.msg }),
});

const validateMiddleware = (req, res, next) => {
    const errors = validationFormatter(req);
    if (!errors.isEmpty()) return next(new ValidationError(errors.array()));

    req.validated = matchedData(req, { includeOptionals: true });
    return next();
};

module.exports = { validateMiddleware };

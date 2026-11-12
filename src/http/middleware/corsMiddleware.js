const { origins } = require("@src/config/cors.js");

const corsMiddleware = (req, res, next) => {
    const origin = req.headers.origin;

    if (origin) res.vary("Origin");

    if (origin && origins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Credentials", "true");
    }

    res.header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Request-Id");
    res.header("Access-Control-Expose-Headers", "X-Request-Id");

    if (req.method === "OPTIONS") {
        res.header("Access-Control-Allow-Methods", "GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS");
        res.header("Access-Control-Max-Age", "86400");
        return res.sendStatus(204);
    }

    return next();
};

module.exports = { corsMiddleware };

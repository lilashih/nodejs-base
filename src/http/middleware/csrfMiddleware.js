const ForbiddenError = require("@src/error/forbiddenError.js");

const sameHost = (value, host) => {
    if (!value || !host) return false;
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) && url.host.toLowerCase() === host.toLowerCase();
    } catch {
        return false;
    }
};

const csrfMiddleware = (req, res, next) => {
    if (req.authSource !== "cookie" || !["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
    const host = req.get("host");
    if (sameHost(req.get("origin"), host) || sameHost(req.get("referer"), host)) return next();
    return next(new ForbiddenError("無效的跨站請求"));
};

module.exports = { csrfMiddleware, sameHost };

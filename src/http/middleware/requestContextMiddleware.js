const { randomUUID } = require("crypto");
const { runRequestContext } = require("@src/helper/requestContext.js");

const normalizeIp = (value = "") => {
    if (!value) return "";
    const normalized = String(value).trim();
    if (!normalized) return "";
    const mappedIp = normalized.replace(/^::ffff:/, "");
    return mappedIp === "::1" ? "127.0.0.1" : mappedIp;
};

const requestContextMiddleware = (req, res, next) => {
    const requestId = randomUUID();
    res.setHeader("X-Request-Id", requestId);

    const clientIp = normalizeIp(req.ip || req.socket?.remoteAddress);

    return runRequestContext(
        {
            requestId,
            method: req.method,
            url: req.originalUrl || req.url,
            clientIp,
        },
        next,
    );
};

module.exports = { requestContextMiddleware, normalizeIp };

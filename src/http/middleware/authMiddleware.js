const jwt = require("jsonwebtoken");
const config = require("@src/config/auth.js");
const UnauthorizedError = require("@src/error/unauthorizedError.js");
const { setUserId } = require("@src/helper/requestContext.js");

const getCookieToken = (req) => {
    const cookie = req.headers.cookie ?? "";
    const entry = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${config.cookie.name}=`));
    return entry ? entry.slice(config.cookie.name.length + 1) : null;
};

const getBearerToken = (req) => {
    const authorization = req.get("authorization") ?? "";
    const [scheme, token] = authorization.split(" ");
    return scheme?.toLowerCase() === "bearer" && token ? token : null;
};

const authMiddleware = (req, res, next) => {
    const cookieToken = getCookieToken(req);
    const token = cookieToken || getBearerToken(req);
    if (!token) return next(new UnauthorizedError());

    try {
        const payload = jwt.verify(token, config.jwt.secret, {
            algorithms: [config.jwt.algorithm],
            issuer: config.jwt.issuer,
            audience: config.jwt.audience,
        });
        req.user = { id: Number(payload.sub) };
        req.authSource = cookieToken ? "cookie" : "bearer";
        setUserId(req.user.id);
        return next();
    } catch {
        return next(new UnauthorizedError("Token 無效或已過期"));
    }
};

module.exports = { authMiddleware, getCookieToken, getBearerToken };

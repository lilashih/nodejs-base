const jwt = require("jsonwebtoken");
const config = require("@src/config/auth.js");

const cookieOptions = () => ({
    path: config.cookie.path,
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookie.secure,
});

const setAuthCookie = (res, token) => {
    const payload = jwt.decode(token);
    const maxAge = Math.max(0, (payload.exp * 1000) - Date.now());
    res.cookie(config.cookie.name, token, { ...cookieOptions(), maxAge });
};

const clearAuthCookie = (res) => {
    res.clearCookie(config.cookie.name, cookieOptions());
};

module.exports = { setAuthCookie, clearAuthCookie };

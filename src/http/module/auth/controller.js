const response = require("@src/http/common/response.js");
const service = require("./service.js");
const { setAuthCookie, clearAuthCookie } = require("./cookie.js");

const register = async (req, res, next) => {
    try {
        return response.success(res, await service.register(req.validated), "註冊成功", 201);
    } catch (error) {
        return next(error);
    }
};

const sessionRegister = async (req, res, next) => {
    try {
        const { user, token } = await service.register(req.validated);
        setAuthCookie(res, token);
        return response.success(res, { user }, "註冊成功", 201);
    } catch (error) {
        return next(error);
    }
};

const login = async (req, res, next) => {
    try {
        return response.success(res, await service.login(req.validated), "登入成功");
    } catch (error) {
        return next(error);
    }
};

const sessionLogin = async (req, res, next) => {
    try {
        const { user, token } = await service.login(req.validated);
        setAuthCookie(res, token);
        return response.success(res, { user }, "登入成功");
    } catch (error) {
        return next(error);
    }
};

const sessionLogout = (req, res) => {
    clearAuthCookie(res);
    return response.success(res, {}, "登出成功");
};

const me = async (req, res, next) => {
    try {
        return response.success(res, { user: await service.getById(req.user.id) });
    } catch (error) {
        return next(error);
    }
};

module.exports = { register, sessionRegister, login, sessionLogin, sessionLogout, me };

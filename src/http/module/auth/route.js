const router = require("express").Router();
const controller = require("./controller.js");
const request = require("./request.js");
const { validateMiddleware } = require("@src/http/middleware/validateMiddleware.js");
const { authMiddleware } = require("@src/http/middleware/authMiddleware.js");

router.post("/auth/register", request.registerRequest, validateMiddleware, controller.register);
router.post("/auth/session/register", request.registerRequest, validateMiddleware, controller.sessionRegister);
router.post("/auth/login", request.loginRequest, validateMiddleware, controller.login);
router.post("/auth/session/login", request.loginRequest, validateMiddleware, controller.sessionLogin);
router.post("/auth/session/logout", controller.sessionLogout);
router.get("/auth/me", authMiddleware, controller.me);

module.exports = { router };

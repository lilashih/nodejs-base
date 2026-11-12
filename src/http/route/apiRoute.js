const express = require("express");
const auth = require("@src/http/module/auth/route.js");
const health = require("@src/http/module/health/route.js");
const post = require("@src/http/module/post/route.js");

const apiRouter = express.Router();

apiRouter.use(health.router, auth.router, post.router);

module.exports = { apiRouter };

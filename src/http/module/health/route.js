const router = require("express").Router();
const controller = require("./controller.js");

router.get("/health", controller.show);

module.exports = { router };

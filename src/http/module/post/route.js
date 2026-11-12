const router = require("express").Router();
const controller = require("./controller.js");
const request = require("./request.js");
const { validateMiddleware } = require("@src/http/middleware/validateMiddleware.js");
const { authMiddleware } = require("@src/http/middleware/authMiddleware.js");
const { csrfMiddleware } = require("@src/http/middleware/csrfMiddleware.js");

router.get("/posts", request.listRequest, validateMiddleware, controller.list);
router.get("/posts/mine", authMiddleware, request.listRequest, validateMiddleware, controller.mine);
router.get("/posts/mine/:id", authMiddleware, request.idRequest, validateMiddleware, controller.showMine);
router.get("/posts/:id", request.idRequest, validateMiddleware, controller.show);
router.post("/posts", authMiddleware, csrfMiddleware, request.postBody, validateMiddleware, controller.create);
router.put("/posts/:id", authMiddleware, csrfMiddleware, request.idRequest, request.postBody, validateMiddleware, controller.update);
router.delete("/posts/:id", authMiddleware, csrfMiddleware, request.idRequest, validateMiddleware, controller.destroy);

module.exports = { router };

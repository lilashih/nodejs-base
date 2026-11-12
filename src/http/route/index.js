const swaggerUi = require("swagger-ui-express");
const { mode } = require("@src/config/app.js");
const { openApiDocument } = require("@src/swagger/swagger.js");
const { apiRouter } = require("@src/http/route/apiRoute.js");
const { registerFrontendRoutes } = require("@src/http/route/frontendRoute.js");

const registerRoutes = (app) => {
    app.use("/api", apiRouter);

    if (["debug", "test"].includes(mode)) {
        app.use("/apidoc", swaggerUi.serve, swaggerUi.setup(openApiDocument));
    }

    registerFrontendRoutes(app);
};

module.exports = { registerRoutes };

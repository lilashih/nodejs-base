const express = require("express");
const uploadConfig = require("@src/config/upload.js");
const { trustProxy } = require("@src/config/app.js");
const { resolveAppPath } = require("@src/helper/file.js");
const { corsMiddleware } = require("@src/http/middleware/corsMiddleware.js");
const { requestContextMiddleware } = require("@src/http/middleware/requestContextMiddleware.js");
const { accessLogMiddleware } = require("@src/http/middleware/accessLogMiddleware.js");
const { notFoundMiddleware } = require("@src/http/middleware/notFoundMiddleware.js");
const { errorMiddleware } = require("@src/http/middleware/errorMiddleware.js");
const { registerRoutes } = require("@src/http/route/index.js");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", trustProxy);

app.use(requestContextMiddleware);
app.use(accessLogMiddleware);
app.use(corsMiddleware);
app.use(
    express.json({
        limit: uploadConfig.jsonLimit,
        verify: (req, res, buffer) => {
            if (buffer.length > 0) req.rawBody = Buffer.from(buffer);
        },
    }),
);
app.use(express.urlencoded({ extended: false, limit: uploadConfig.jsonLimit }));

app.use(uploadConfig.publicUrlPrefix, express.static(resolveAppPath(uploadConfig.storageDir)));

registerRoutes(app);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;

const appConfig = require("@src/config/app.js");
const response = require("@src/http/common/response.js");

const show = (req, res) => {
    return response.success(res, {
        name: appConfig.name,
        version: appConfig.version,
        mode: appConfig.mode,
        status: "ok",
    });
};

module.exports = { show };

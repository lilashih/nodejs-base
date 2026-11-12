const { mode } = require("@src/config/app.js");
const config = require("@src/config/log.js");
const { createLogger } = require("@src/logger/loggerFactory.js");

module.exports = createLogger({
    level: "info",
    filename: `${config.folder}/access-%DATE%.log`,
    retentionDays: config.retentionDays,
    consoleEnabled: false,
    requestContextEnabled: true,
    fileEnabled: config.enableAccessLog && mode !== "test",
});

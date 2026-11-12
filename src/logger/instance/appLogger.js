const { mode } = require("@src/config/app.js");
const config = require("@src/config/log.js");
const { createLogger } = require("@src/logger/loggerFactory.js");

module.exports = createLogger({
    level: config.level,
    filename: `${config.folder}/app-%DATE%.log`,
    retentionDays: config.retentionDays,
    consoleEnabled: mode === "debug" || mode === "test",
    requestContextEnabled: true,
    fileEnabled: mode !== "test",
});

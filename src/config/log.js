const { resolveAppPath } = require("@src/helper/file.js");

const parseRetentionDays = (value) => {
    const days = Number(value);
    return Number.isFinite(days) && days > 0 ? days : 0;
};

module.exports = {
    level: process.env.LOG_LEVEL ?? "info", // error、warn、info、http、verbose、debug、silly
    retentionDays: parseRetentionDays(process.env.LOG_RETENTION_DAYS ?? 0),
    folder: resolveAppPath("storage", "log"),

    enableAccessLog: String(process.env.LOG_ENABLE_ACCESS_LOG ?? "true").trim().toLowerCase() === "true",
};

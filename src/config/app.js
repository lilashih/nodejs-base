const packageJson = require("../../package.json");

const parseTrustProxy = (value = "loopback") => {
    const normalized = String(value).trim().toLowerCase();

    if (normalized === "true") return true;
    if (normalized === "false" || normalized === "") return false;

    const number = Number(normalized);
    return Number.isInteger(number) && number >= 0 ? number : value;
};

module.exports = {
    name: packageJson.name,
    version: packageJson.version,
    mode: process.env.APP_MODE ?? "production", // production、debug 、test
    host: process.env.APP_HOST ?? "127.0.0.1", // production 請設定 0.0.0.0
    port: Number(process.env.APP_PORT ?? 3000),
    trustProxy: parseTrustProxy(process.env.APP_TRUST_PROXY),
};

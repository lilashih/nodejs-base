const path = require("path");

const executableName = path.basename(process.execPath || "").toLowerCase();
const isBundledExecutable = Boolean(process.versions?.bun)
    && executableName !== "bun.exe"
    && executableName !== "bunx.exe" && executableName !== "bun" && executableName !== "bunx";
const appRoot = isBundledExecutable
    ? path.dirname(process.execPath)
    : path.resolve(__dirname, "../../");

module.exports = {
    appRoot,
    isBundledExecutable,
    resolveAppPath: (...segments) => path.join(appRoot, ...segments),
};

const path = require("path");
const fs = require("fs");
const { resolveAppPath, isBundledExecutable } = require("@src/helper/file.js");

const resolveFrontendPath = () => {
    const configuredPath = process.env.APP_FRONTEND_PATH;
    if (configuredPath) {
        return path.isAbsolute(configuredPath) ? configuredPath : resolveAppPath(configuredPath);
    }

    if (isBundledExecutable) {
        return resolveAppPath("dist");
    }

    const frontendDistPath = resolveAppPath("frontend", "dist");
    if (fs.existsSync(frontendDistPath)) {
        return frontendDistPath;
    }

    const rootDistPath = resolveAppPath("dist");
    if (fs.existsSync(rootDistPath)) {
        return rootDistPath;
    }

    return frontendDistPath;
};

const frontendPath = resolveFrontendPath();

module.exports = {
    frontendPath,
    frontendIndexPath: path.join(frontendPath, "index.html"),
};

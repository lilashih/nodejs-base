const fs = require("fs");
const YAML = require("yaml");
const { resolveAppPath } = require("@src/helper/file.js");
const { version } = require("@src/config/app.js");

const loadOpenApiDocument = () => {
    if (process.versions?.bun) {
        try {
            return require("./openapi.yaml");
        } catch {
            // fallback 至檔案讀取
        }
    }
    const openApiPath = resolveAppPath("src", "swagger", "openapi.yaml");
    return YAML.parse(fs.readFileSync(openApiPath, "utf8"));
};

const openApiDocument = loadOpenApiDocument();
openApiDocument.info = openApiDocument.info || {};
openApiDocument.info.version = version;

module.exports = { openApiDocument };

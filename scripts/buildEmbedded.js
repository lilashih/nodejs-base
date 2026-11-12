const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const projectRoot = path.resolve(__dirname, "..");
const distDirectory = path.join(projectRoot, "frontend", "dist");
const outputModulePath = path.join(projectRoot, "src", "http", "asset", "embeddedAssets.js");

const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".txt": "text/plain; charset=utf-8",
    ".map": "application/json; charset=utf-8",
};

const resolveMimeType = (filePath) => {
    const extension = path.extname(filePath).toLowerCase();
    return mimeTypes[extension] ?? "application/octet-stream";
};

const computeEtag = (buffer) => {
    const hash = crypto.createHash("sha256").update(buffer).digest("hex").slice(0, 16);
    return `"${hash}"`;
};

const findFilesRecursively = (directory) => {
    if (!fs.existsSync(directory)) return [];

    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            return findFilesRecursively(fullPath);
        }
        return entry.isFile() ? [fullPath] : [];
    });
};

const buildEmbedded = () => {
    console.log("開始生成前端內嵌資產字典模組...");

    if (!fs.existsSync(distDirectory)) {
        throw new Error(`找不到前端建置目錄：${distDirectory}，請先執行 pnpm --dir frontend build。`);
    }

    const files = findFilesRecursively(distDirectory);
    if (files.length === 0) {
        throw new Error(`前端建置目錄為空：${distDirectory}`);
    }

    const assetsMap = {};

    for (const filePath of files) {
        const relativePath = path.relative(distDirectory, filePath).replace(/\\/g, "/");
        const fileBuffer = fs.readFileSync(filePath);
        const contentType = resolveMimeType(filePath);
        const etag = computeEtag(fileBuffer);
        const base64 = fileBuffer.toString("base64");

        assetsMap[relativePath] = {
            contentType,
            etag,
            base64,
        };
    }

    const generatedCode = `// 自動生成的靜態資產內嵌模組，請勿手動修改
const assetsData = ${JSON.stringify(assetsMap, null, 2)};

const embeddedAssets = {};
for (const [key, item] of Object.entries(assetsData)) {
    embeddedAssets[key] = {
        contentType: item.contentType,
        etag: item.etag,
        content: Buffer.from(item.base64, "base64"),
    };
}

const normalizePath = (targetPath) => {
    return targetPath.replace(/^\\/+/, "").replace(/\\\\/g, "/");
};

const getEmbeddedAsset = (relativePath) => {
    const normalized = normalizePath(relativePath);
    return embeddedAssets[normalized] ?? null;
};

const getEmbeddedIndex = () => {
    return embeddedAssets["index.html"] ?? null;
};

module.exports = {
    hasEmbeddedFrontend: true,
    embeddedAssets,
    getEmbeddedAsset,
    getEmbeddedIndex,
};
`;

    fs.writeFileSync(outputModulePath, generatedCode, "utf8");
    console.log(`成功內嵌 ${files.length} 個前端資產至 ${path.relative(projectRoot, outputModulePath)}`);
};

if (require.main === module) {
    try {
        buildEmbedded();
    } catch (error) {
        console.error("生成前端內嵌模組失敗：", error.message);
        process.exit(1);
    }
}

module.exports = { buildEmbedded };

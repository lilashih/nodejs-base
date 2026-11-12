const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const targetDirectories = ["src", "test", "scripts"];

const isIgnoredFile = (fileName) => {
    return [
        "ecosystem.config.js",
        "knexfile.js",
    ].includes(fileName);
};

const validateFileName = (filePath) => {
    const fileName = path.basename(filePath);
    if (isIgnoredFile(fileName)) return true;

    // 支援 *.test.js 測試檔
    const base = fileName.endsWith(".test.js")
        ? fileName.replace(".test.js", "")
        : path.parse(fileName).name;

    // 支援 Migration 檔名格式 m2026...
    if (/^m\d{14}[A-Z][A-Za-z0-9]*$/.test(base)) return true;

    // 標準 camelCase 規則驗證
    const camelCaseRegex = /^[a-z][a-zA-Z0-9]*$/;
    return camelCaseRegex.test(base);
};

const findJavaScriptFiles = (directory) => {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const target = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            return findJavaScriptFiles(target);
        }

        return entry.isFile() && entry.name.endsWith(".js") ? [target] : [];
    });
};

const files = targetDirectories.flatMap((directory) => {
    const target = path.join(projectRoot, directory);
    return fs.existsSync(target) ? findJavaScriptFiles(target) : [];
});

files.push(path.join(projectRoot, "knexfile.js"));

const ecosystemConfigPath = path.join(projectRoot, "ecosystem.config.js");
if (fs.existsSync(ecosystemConfigPath)) {
    files.push(ecosystemConfigPath);
}

for (const file of files) {
    if (!validateFileName(file)) {
        console.error(`檔名不符合命名規範（必須為 camelCase）：${path.relative(projectRoot, file)}`);
        process.exit(1);
    }

    const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });

    if (result.status !== 0) {
        process.exit(result.status || 1);
    }
}

console.log(`語法與檔名檢查完成，共檢查 ${files.length} 個 JavaScript 檔案。`);

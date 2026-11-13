const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const releaseDir = path.join(projectRoot, "release");

const parseArguments = () => {
    const arguments_ = process.argv.slice(2);
    let target = process.platform === "win32" ? "windows" : "linux";
    let skipFrontend = false;

    for (const argument of arguments_) {
        if (argument.startsWith("--target=")) {
            target = argument.split("=")[1].toLowerCase();
        } else if (argument === "--skip-frontend") {
            skipFrontend = true;
        }
    }

    return { target, skipFrontend };
};

const executeCommand = (command, arguments_, options = {}) => {
    console.log(`\n執行指令：${command} ${arguments_.join(" ")}`);
    const result = spawnSync(command, arguments_, {
        cwd: projectRoot,
        stdio: "inherit",
        shell: true,
        ...options,
    });

    if (result.status !== 0) {
        console.error(`\n指令執行失敗（Exit Code: ${result.status}）：${command} ${arguments_.join(" ")}`);
        process.exit(result.status || 1);
    }
};

const removeFileIfExists = (filePath) => {
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
        } catch {
            // 若遭系統進程暫時鎖定則忽略
        }
    }
};

const resolveWindowsIconArguments = (isWindows) => {
    if (!isWindows) return [];

    const iconPath = path.join(projectRoot, "frontend", "public", "favicon.ico");
    if (!fs.existsSync(iconPath)) {
        console.warn("找不到 frontend/public/favicon.ico，將使用 Bun 預設的 Windows 執行檔圖示繼續打包。");
        return [];
    }

    return ["--windows-icon=frontend/public/favicon.ico"];
};

const compileBunExecutable = (baseArguments, windowsIconArguments = [], outputPath) => {
    if (outputPath) {
        removeFileIfExists(outputPath);
    }

    if (windowsIconArguments.length > 0) {
        const argumentsWithIcon = [
            baseArguments[0],
            ...windowsIconArguments,
            ...baseArguments.slice(1),
        ];

        console.log(`\n執行指令：bun ${argumentsWithIcon.join(" ")}`);
        const result = spawnSync("bun", argumentsWithIcon, {
            cwd: projectRoot,
            stdio: "inherit",
            shell: true,
        });

        if (result.status === 0) {
            return;
        }

        console.warn(`\n警告：設定 Windows 執行檔圖示失敗（Exit Code: ${result.status}）。`);
        console.warn("將自動降級為使用 Bun 預設圖示重新編譯...\n");
        if (outputPath) {
            removeFileIfExists(outputPath);
        }
    }

    executeCommand("bun", baseArguments);
};

const checkBunInstalled = () => {
    const result = spawnSync("bun", ["--version"], { shell: true });
    if (result.status !== 0) {
        console.error("系統中未找到 Bun，請先安裝 Bun（https://bun.sh）。");
        process.exit(1);
    }
};

const ensureDirectoryExists = (directoryPath) => {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }
};

const build = () => {
    const { target, skipFrontend } = parseArguments();

    console.log("========================================");
    console.log("開始執行 Bun 單一執行檔完整建置流程");
    console.log(`目標平台：${target}`);
    console.log("========================================");

    checkBunInstalled();

    // 1. 語法與檔名規範檢查
    console.log("\n[1/5] 執行後端語法與檔名規範檢查...");
    executeCommand("node", ["scripts/checkSyntax.js"]);

    // 2. 前端型別檢查與建置
    if (skipFrontend) {
        console.log("\n[2/5] 跳過前端建置（--skip-frontend）");
        const embeddedModulePath = path.join(projectRoot, "src", "http", "asset", "embeddedAssets.js");
        const distDirectory = path.join(projectRoot, "frontend", "dist");
        if (!fs.existsSync(embeddedModulePath) && fs.existsSync(distDirectory)) {
            console.log("偵測到尚未生成內嵌模組，執行資產提取...");
            executeCommand("node", ["scripts/buildEmbedded.js"]);
        }
    } else {
        console.log("\n[2/5] 執行前端型別檢查與 Vite 打包...");
        executeCommand("pnpm", ["--dir", "frontend", "check"]);
        executeCommand("pnpm", ["--dir", "frontend", "build"]);

        console.log("\n[2.5/5] 生成前端內嵌資產字典模組...");
        executeCommand("node", ["scripts/buildEmbedded.js"]);
    }

    // 3. 確保發布目錄存在
    console.log("\n[3/5] 建立 release 目錄...");
    ensureDirectoryExists(releaseDir);

    const isWindows = target === "windows";
    const bunTargetFlag = isWindows ? "bun-windows-x64-modern" : "bun-linux-x64-modern";
    const appExecutableName = isWindows ? "app.exe" : "app";
    const migrateExecutableName = isWindows ? "migrate.exe" : "migrate";
    const windowsIconArguments = resolveWindowsIconArguments(isWindows);

    const appOutputPath = path.join(releaseDir, appExecutableName);
    const migrateOutputPath = path.join(releaseDir, migrateExecutableName);

    // 4. 編譯後端主服務
    console.log("\n[4/5] 編譯主服務執行檔（app）...");
    compileBunExecutable([
        "build",
        "--compile",
        "--minify",
        `--target=${bunTargetFlag}`,
        "src/app.js",
        "--outfile",
        appOutputPath,
    ], windowsIconArguments, appOutputPath);

    // 5. 編譯資料庫遷移工具
    console.log("\n[5/5] 編譯資料庫遷移工具（migrate）...");
    const knexUnusedDialects = [
        "pg",
        "sqlite3",
        "tedious",
        "oracledb",
        "mariadb",
        "mysql",
        "pgnative",
        "better-sqlite3",
    ];
    const externalArguments = knexUnusedDialects.flatMap((dialect) => ["--external", dialect]);

    compileBunExecutable([
        "build",
        "--compile",
        "--minify",
        `--target=${bunTargetFlag}`,
        ...externalArguments,
        "scripts/migrate.js",
        "--outfile",
        migrateOutputPath,
    ], windowsIconArguments, migrateOutputPath);

    console.log("\n========================================");
    console.log("Bun 單一執行檔打包完成！產物清單：");
    console.log(`- 主服務：${appOutputPath}`);
    console.log(`- Migration 工具：${migrateOutputPath}`);
    console.log("========================================\n");
};

build();


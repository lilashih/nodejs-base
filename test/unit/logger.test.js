require("module-alias/register");

const fs = require("fs");
const os = require("os");
const path = require("path");
const winston = require("winston");

const accessLogger = require("@src/logger/instance/accessLogger.js");
const appLogger = require("@src/logger/instance/appLogger.js");
const migrateLogger = require("@src/logger/instance/migrateLogger.js");
const DailyRotate = require("@src/logger/dailyRotate.js");
const {
    buildFileTransportOptions,
    createLogger,
} = require("@src/logger/loggerFactory.js");

const waitFor = async (condition, timeoutMs = 3000) => {
    const startedAt = Date.now();

    while (!condition()) {
        if (Date.now() - startedAt >= timeoutMs) throw new Error("等待日誌檔案逾時");
        await new Promise((resolve) => setTimeout(resolve, 20));
    }
};

const closeLogger = async (logger) => {
    logger.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
};

describe("Logger Factory 日誌工廠", () => {
    test("永久保留模式不設定 maxFiles", () => {
        const options = buildFileTransportOptions({
            level: "info",
            filename: "app-%DATE%.log",
            retentionDays: 0,
        });

        expect(options).not.toHaveProperty("maxFiles");
    });

    test("保存天數大於零時設定 maxFiles", () => {
        const options = buildFileTransportOptions({
            level: "info",
            filename: "app-%DATE%.log",
            retentionDays: 30,
        });

        expect(options).toHaveProperty("maxFiles", "30d");
    });

    test("檔案 transport 啟用刪除監看", () => {
        const options = buildFileTransportOptions({
            level: "info",
            filename: "app-%DATE%.log",
        });

        expect(options).toHaveProperty("watchLog", true);
    });

    test("檔案 transport 可停用刪除監看", () => {
        const options = buildFileTransportOptions({
            level: "info",
            filename: "migrate-%DATE%.log",
            watchLog: false,
        });

        expect(options).toHaveProperty("watchLog", false);
    });

    test("未提供檔名時不可啟用檔案日誌", () => {
        expect(() => createLogger({ fileEnabled: true })).toThrow("啟用檔案日誌時必須提供 filename");
    });
});

describe("Logger Instance 日誌實例", () => {
    afterAll(() => migrateLogger.close());

    test("App Logger 使用環境設定的 level", () => {
        expect(appLogger.level).toBe("error");
    });

    test("Access Logger 固定使用 info 且測試環境不建立 transport", () => {
        expect(accessLogger.level).toBe("info");
        expect(accessLogger.transports).toHaveLength(0);
    });

    test("Migration Logger 固定記錄 info 並建立未開啟監看的檔案 transport", () => {
        expect(migrateLogger.level).toBe("info");
        const fileTransport = migrateLogger.transports.find((transport) => transport instanceof DailyRotate);
        expect(fileTransport).toBeDefined();
        expect(fileTransport.options).toHaveProperty("watchLog", false);
    });

    test("各類日誌使用明確的檔名前綴", () => {
        const filenames = ["app-%DATE%.log", "access-%DATE%.log", "migrate-%DATE%.log"];

        for (const filename of filenames) {
            expect(buildFileTransportOptions({ level: "info", filename }).filename).toBe(filename);
        }
    });
});

describe("Daily Rotate 日誌每日輪轉", () => {
    test("運行期間刪除日誌後會重新建立並繼續寫入", async () => {
        const folder = fs.mkdtempSync(path.join(os.tmpdir(), "logger-file-recovery-"));
        const filename = path.join(folder, "app-%DATE%.log");
        const transport = new DailyRotate({ filename, datePattern: "YYYY-MM-DD" });
        const logger = winston.createLogger({ transports: [transport] });

        try {
            logger.info("刪除前");
            await waitFor(() => fs.readdirSync(folder).some((file) => file.endsWith(".log")));

            const logFile = path.join(folder, fs.readdirSync(folder).find((file) => file.endsWith(".log")));
            fs.unlinkSync(logFile);
            logger.info("刪除後");

            await waitFor(() => fs.existsSync(logFile) && fs.readFileSync(logFile, "utf8").includes("刪除後"));
        } finally {
            await closeLogger(logger);
            fs.rmSync(folder, { recursive: true, force: true });
        }
    });

    test("運行期間刪除日誌目錄後會重新建立並繼續寫入", async () => {
        const folder = fs.mkdtempSync(path.join(os.tmpdir(), "logger-folder-recovery-"));
        const filename = path.join(folder, "app-%DATE%.log");
        const logger = createLogger({
            level: "info",
            filename,
            consoleEnabled: false,
            requestContextEnabled: false,
            fileEnabled: true,
        });

        try {
            logger.info("目錄刪除前");
            await waitFor(() => fs.readdirSync(folder).some((file) => file.endsWith(".log")));

            fs.rmSync(folder, { recursive: true, force: true });
            logger.info("目錄刪除後");

            await waitFor(() => fs.existsSync(folder)
                && fs.readdirSync(folder).some((file) => file.endsWith(".log"))
                && fs.readFileSync(
                    path.join(folder, fs.readdirSync(folder).find((file) => file.endsWith(".log"))),
                    "utf8",
                ).includes("目錄刪除後"));
        } finally {
            await closeLogger(logger);
            fs.rmSync(folder, { recursive: true, force: true });
        }
    });
});

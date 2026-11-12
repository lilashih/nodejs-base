if (!process.versions?.bun) require("module-alias/register");

const readline = require("readline/promises");

const databaseConfig = require("@src/config/db.js");
const logger = require("@src/logger/instance/migrateLogger.js");
const { createRunner, freshDatabase } = require("@src/migrate/core/runner.js");

const askForConfirmation = async (message) => {
    if (process.argv.includes("--yes")) return true;

    const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
        return (await terminal.question(`${message}（輸入 yes 繼續）：`)).trim().toLowerCase() === "yes";
    } finally {
        terminal.close();
    }
};

const run = async () => {
    const command = process.argv[2] ?? "up";

    if (command === "fresh") {
        const databaseName = databaseConfig.client === "sqlite"
            ? databaseConfig.sqlite.filename
            : databaseConfig.mysql.database;
        const confirmed = await askForConfirmation(`即將刪除並重建資料庫 ${databaseName}`);
        if (!confirmed) return console.log("已取消 fresh。\n");
        await freshDatabase({ logger });
        return;
    }

    const runner = createRunner({ logger });
    try {
        if (command === "up") {
            await runner.up();
        } else if (command === "rollback") {
            const stepArgument = process.argv.find((argument) => argument.startsWith("--step="));
            const step = stepArgument ? Number(stepArgument.split("=")[1]) : undefined;
            const confirmed = await askForConfirmation("即將回滾最近一批 Migration");
            if (confirmed) await runner.rollback(step);
            else console.log("已取消 rollback。\n");
        } else if (command === "unlock") {
            await runner.unlock();
        } else {
            throw new Error(`不支援的指令：${command}`);
        }
    } finally {
        await runner.destroy();
    }
};

run().catch((error) => {
    logger.error("Migration 指令執行失敗", { error: error.message });
    process.exitCode = 1;
}).finally(() => logger.close());

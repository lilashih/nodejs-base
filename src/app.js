if (!process.versions?.bun) require("module-alias/register");

const http = require("http");
const fs = require("fs");
const app = require("./http/app.js");
const appConfig = require("./config/app.js");
const authConfig = require("./config/auth.js");
const db = require("./db/index.js");
const logger = require("./logger/instance/appLogger.js");
const { frontendIndexPath } = require("./config/frontend.js");
const { hasEmbeddedFrontend } = require("./http/asset/embeddedAssets.js");

const start = async () => {
    if (!authConfig.jwt.secret || authConfig.jwt.secret.length < 32) {
        throw new Error("JWT_SECRET 必須設定為至少 32 個字元");
    }
    if (appConfig.mode === "production" && !fs.existsSync(frontendIndexPath) && !hasEmbeddedFrontend) {
        throw new Error("找不到前端資源：未檢測到前端 dist 目錄，且執行檔未內嵌前端資源。");
    }
    await db.testConnection();

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(appConfig.port, appConfig.host, resolve));
    logger.info(`${appConfig.name} v${appConfig.version} 已啟動`, {
        host: appConfig.host,
        port: appConfig.port,
        mode: appConfig.mode,
    });
    return server;
};

const stop = async (server) => {
    if (server?.listening) {
        await new Promise((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
        });
    }
    await db.close();
};

if (require.main === module) {
    let server;

    start()
        .then((startedServer) => {
            server = startedServer;
        })
        .catch((error) => {
            console.error("應用程式啟動失敗：", error);
            logger.error("應用程式啟動失敗", { errorMessage: error.message, stack: error.stack });
            db.close()
                .catch(() => {})
                .finally(() => process.exit(1));
        });

    const shutdown = async (signal) => {
        logger.info(`收到 ${signal}，關閉應用程式`);
        try {
            await stop(server);
            process.exit(0);
        } catch (error) {
            logger.error("關閉應用程式失敗", { errorMessage: error.message, stack: error.stack });
            process.exit(1);
        }
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.on("uncaughtException", (error) => {
        logger.error("未捕捉的例外", { errorMessage: error.message, stack: error.stack });
        shutdown("uncaughtException");
    });
    process.on("unhandledRejection", (error) => {
        logger.error("未處理的 Promise rejection", { errorMessage: error?.message, stack: error?.stack });
        shutdown("unhandledRejection");
    });
}

module.exports = { start, stop };

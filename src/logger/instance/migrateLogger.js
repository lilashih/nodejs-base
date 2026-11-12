const config = require("@src/config/log.js");
const { createLogger } = require("@src/logger/loggerFactory.js");

// Migration 為短暫生命週期任務（CLI 執行或資料庫初始化），執行完畢後程序應自然退出
// 將 watchLog 設為 false，避免 winston-daily-rotate-file 在底層建立持久的 fs.watch（FSEVENTWRAP）檔案監看 handle，徹底消除程序結束或測試引用時因未釋放非同步資源而卡死的問題
module.exports = createLogger({
    level: "info",
    filename: `${config.folder}/migrate-%DATE%.log`,
    retentionDays: config.retentionDays,
    consoleEnabled: true,
    requestContextEnabled: false,
    watchLog: false,
});

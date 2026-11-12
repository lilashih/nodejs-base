const { AsyncLocalStorage } = require("async_hooks");

const requestContext = new AsyncLocalStorage();

// 開啟請求上下文邊界
const runRequestContext = (initialData, callback) => {
    return requestContext.run({ ...initialData }, callback);
};

// 取得當前上下文儲存物件（若非 HTTP 請求發起則回傳 null）
const getRequestContext = () => requestContext.getStore() ?? null;

const setContextValue = (key, value) => {
    const store = getRequestContext();
    if (store) store[key] = value;
};

// 動態更新上下文欄位
const setClientIp = (clientIp) => setContextValue("clientIp", clientIp);
const setUserId = (userId) => setContextValue("userId", userId);

module.exports = {
    runRequestContext,
    getRequestContext,
    setClientIp,
    setUserId,
};

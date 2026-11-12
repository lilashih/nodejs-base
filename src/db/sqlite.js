const { AsyncLocalStorage } = require("async_hooks");
const { openDatabase, execute } = require("@src/db/sqliteNative.js");

let database;
let queue = Promise.resolve();
const transactionStorage = new AsyncLocalStorage();

const getDatabase = () => {
    database ??= openDatabase();
    return database;
};

const serialize = (operation) => {
    const result = queue.then(operation);
    queue = result.catch(() => {});
    return result;
};

const query = (sql, values = []) => {
    const activeConnection = transactionStorage.getStore();
    if (activeConnection) {
        return Promise.resolve(execute(activeConnection, sql, values));
    }
    return serialize(() => execute(getDatabase(), sql, values));
};
const testConnection = async () => { await query("SELECT 1 AS connected"); };

const transaction = (callback) => serialize(async () => {
    const connection = getDatabase();
    let hasBegun = false;

    try {
        connection.exec("BEGIN IMMEDIATE");
        hasBegun = true;
        const transactionQuery = (sql, values = []) => Promise.resolve(execute(connection, sql, values));
        const result = await transactionStorage.run(connection, () => callback(transactionQuery));
        connection.exec("COMMIT");
        return result;
    } catch (error) {
        if (hasBegun) {
            try {
                connection.exec("ROLLBACK");
            } catch {
                // 忽略二次 rollback 失敗，確保拋出原始錯誤
            }
        }
        throw error;
    }
});

const close = () => serialize(() => {
    database?.close();
    database = undefined;
});

module.exports = { query, testConnection, transaction, close };

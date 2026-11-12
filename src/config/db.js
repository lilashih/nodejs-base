const path = require("path");
const { resolveAppPath } = require("@src/helper/file.js");

const parseClient = (value) => {
    const client = value.toLowerCase();
    if (!["mysql", "sqlite"].includes(client)) {
        throw new Error(`不支援的 DB_CLIENT：${client}`);
    }
    return client;
};

const resolveSqliteFile = (filename) => {
    if (filename === ":memory:" || path.isAbsolute(filename)) return filename;
    return resolveAppPath(filename);
};

module.exports = {
    client: parseClient(process.env.DB_CLIENT ?? "mysql"), // mysql, sqlite
    mysql: {
        host: process.env.MYSQL_HOST ?? "127.0.0.1",
        port: Number(process.env.MYSQL_PORT ?? 3306),
        user: process.env.MYSQL_USER ?? "root",
        password: process.env.MYSQL_PASSWORD ?? "",
        database: process.env.MYSQL_DATABASE ?? "nodejs_base",
        connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT ?? 10),
    },
    sqlite: {
        filename: resolveSqliteFile(process.env.SQLITE_FILE ?? "storage/database/database.sqlite"),
    },
};

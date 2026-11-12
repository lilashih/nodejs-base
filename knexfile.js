require("module-alias/register");

const databaseConfig = require("@src/config/db.js");
const { mysql: mysqlConfig, sqlite: sqliteConfig } = databaseConfig;
const SqliteKnexClient = require("@src/migrate/core/sqliteKnexClient.js");

module.exports = databaseConfig.client === "sqlite" ? {
    client: SqliteKnexClient,
    connection: { filename: sqliteConfig.filename },
    useNullAsDefault: true,
    pool: { min: 1, max: 1 },
} : {
    client: "mysql2",
    connection: {
        host: mysqlConfig.host,
        port: mysqlConfig.port,
        user: mysqlConfig.user,
        password: mysqlConfig.password,
        database: mysqlConfig.database,
    },
    pool: { min: 0, max: mysqlConfig.connectionLimit },
};

const knexFactory = require("knex");
const fs = require("fs");

const appConfig = require("@src/config/app.js");
const databaseConfig = require("@src/config/db.js");
const { mysql: mysqlConfig, sqlite: sqliteConfig } = databaseConfig;
const SqliteKnexClient = require("@src/migrate/core/sqliteKnexClient.js");
const RegistryMigrationSource = require("@src/migrate/core/registryMigrationSource.js");
const registry = require("@src/migrate/registry.js");

const validateRegistry = (migrations) => {
    const names = new Set();
    let previousName = "";

    for (const migration of migrations) {
        if (!migration.name || typeof migration.up !== "function" || typeof migration.down !== "function") {
            throw new Error("每筆 Migration 都必須提供 name、up 與 down function");
        }
        if (names.has(migration.name)) throw new Error(`Migration 名稱重複：${migration.name}`);
        if (previousName && migration.name <= previousName) {
            throw new Error(`Migration registry 順序錯誤：${migration.name}`);
        }
        if (typeof migration.transaction !== "boolean") {
            throw new Error(`Migration ${migration.name} 必須明確設定 transaction`);
        }
        names.add(migration.name);
        previousName = migration.name;
    }
};

const createConnectionConfig = (includeDatabase = true) => ({
    host: mysqlConfig.host,
    port: mysqlConfig.port,
    user: mysqlConfig.user,
    password: mysqlConfig.password,
    ...(includeDatabase ? { database: mysqlConfig.database } : {}),
});

const createKnexConfig = () => databaseConfig.client === "sqlite" ? {
    client: SqliteKnexClient,
    connection: { filename: sqliteConfig.filename },
    useNullAsDefault: true,
    pool: { min: 1, max: 1 },
} : {
    client: "mysql2",
    connection: createConnectionConfig(),
    pool: { min: 0, max: mysqlConfig.connectionLimit },
};

const createRunner = ({ logger } = {}) => {
    if (!logger || typeof logger.info !== "function" || typeof logger.error !== "function") {
        throw new Error("createRunner 必須提供 logger");
    }

    validateRegistry(registry);
    const migrationSource = new RegistryMigrationSource(registry, logger);
    const knex = knexFactory(createKnexConfig());
    const migrationOptions = { migrationSource };

    return {
        async up() {
            await knex.migrate.list(migrationOptions);
            const result = await knex.migrate.latest(migrationOptions);
            const migrations = result?.[1] ?? [];
            logger.info(
                migrations.length ? "Migration 批次執行完成" : "沒有需要執行的 Migration",
                { count: migrations.length, migrations },
            );
            return result;
        },
        async rollback(step) {
            await knex.migrate.list(migrationOptions);
            if (step !== undefined) {
                if (!Number.isInteger(step) || step < 1) throw new Error("rollback step 必須是大於 0 的整數");
                const batches = [];
                for (let index = 0; index < step; index += 1) {
                    const result = await knex.migrate.down(migrationOptions);
                    if (!result[1]?.length) break;
                    batches.push(...result[1]);
                }
                logger.info(
                    batches.length ? "Migration 批次回滾完成" : "沒有需要回滾的 Migration",
                    { count: batches.length, batches },
                );
                return batches;
            }
            const result = await knex.migrate.rollback(migrationOptions);
            const migrations = result?.[1] ?? [];
            logger.info(
                migrations.length ? "Migration 批次回滾完成" : "沒有需要回滾的 Migration",
                { count: migrations.length, migrations },
            );
            return result;
        },
        async unlock() {
            const result = await knex.migrate.forceFreeMigrationsLock(migrationOptions);
            logger.info("Migration 鎖定已解除");
            return result;
        },
        destroy: () => knex.destroy(),
    };
};

const freshDatabase = async ({ logger } = {}) => {
    if (!logger || typeof logger.info !== "function" || typeof logger.error !== "function") {
        throw new Error("freshDatabase 必須提供 logger");
    }
    if (appConfig.mode !== "debug" && appConfig.mode !== "test") {
        throw new Error("fresh 僅允許在 debug 或 test 模式執行");
    }
    if (databaseConfig.client === "sqlite") {
        if (sqliteConfig.filename === ":memory:") throw new Error("fresh 不支援 SQLite 記憶體資料庫");
        logger.info("SQLite 資料庫重新建立中", { filename: sqliteConfig.filename });
        for (const suffix of ["", "-wal", "-shm"]) {
            try {
                fs.unlinkSync(`${sqliteConfig.filename}${suffix}`);
            } catch (error) {
                if (error.code !== "ENOENT") throw error;
            }
        }
        const runner = createRunner({ logger });
        try {
            return await runner.up();
        } finally {
            await runner.destroy();
        }
    }
    if (!/^[A-Za-z0-9_]+$/.test(mysqlConfig.database)) throw new Error("MYSQL_DATABASE 名稱不合法");

    logger.info("資料庫重新建立中", { database: mysqlConfig.database });

    const admin = knexFactory({ client: "mysql2", connection: createConnectionConfig(false) });
    try {
        await admin.raw("DROP DATABASE IF EXISTS ??", [mysqlConfig.database]);
        await admin.raw("CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci", [mysqlConfig.database]);
    } finally {
        await admin.destroy();
    }

    const runner = createRunner({ logger });
    try {
        return await runner.up();
    } finally {
        await runner.destroy();
    }
};

module.exports = { createRunner, freshDatabase, validateRegistry };

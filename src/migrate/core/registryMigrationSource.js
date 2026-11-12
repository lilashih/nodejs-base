class RegistryMigrationSource {
    constructor(registry, logger) {
        this.registry = registry;
        this.logger = logger;
    }

    getMigrations() {
        return Promise.resolve(this.registry);
    }

    getMigrationName(migration) {
        return migration.name;
    }

    getMigration(migration) {
        return {
            config: { transaction: migration.transaction },
            up: async (knex) => {
                const startedAt = Date.now();
                await migration.up(knex);
                const executionMs = Date.now() - startedAt;
                this.logger.info("Migration 執行完成", { name: migration.name, executionMs });
            },
            down: async (knex) => {
                await migration.down(knex);
                this.logger.info("Migration 回滾完成", { name: migration.name });
            },
        };
    }
}

module.exports = RegistryMigrationSource;

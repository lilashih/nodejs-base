require("module-alias/register");

const RegistryMigrationSource = require("@src/migrate/core/registryMigrationSource.js");

describe("RegistryMigrationSource 遷移來源", () => {
    const logger = { info: jest.fn() };
    const migration = {
        name: "202609090001_example",
        transaction: false,
        up: jest.fn().mockResolvedValue(undefined),
        down: jest.fn().mockResolvedValue(undefined),
    };

    test("執行標準 up function", async () => {
        const knex = {};
        const source = new RegistryMigrationSource([migration], logger);

        await source.getMigration(migration).up(knex);

        expect(migration.up).toHaveBeenCalledWith(knex);
        expect(logger.info).toHaveBeenCalledWith("Migration 執行完成", expect.objectContaining({
            name: migration.name,
        }));
    });

    test("執行標準 down function", async () => {
        const knex = {};
        const source = new RegistryMigrationSource([migration], logger);

        await source.getMigration(migration).down(knex);

        expect(migration.down).toHaveBeenCalledWith(knex);
    });
});

require("module-alias/register");

const mockKnex = {
    migrate: {
        list: jest.fn().mockResolvedValue([]),
        latest: jest.fn().mockResolvedValue([1, ["m20260912000001CreateUsersTable"]]),
        down: jest.fn().mockResolvedValue([1, ["m20260912000001CreateUsersTable"]]),
        rollback: jest.fn().mockResolvedValue([1, ["m20260912000001CreateUsersTable"]]),
        forceFreeMigrationsLock: jest.fn().mockResolvedValue(true),
    },
    destroy: jest.fn().mockResolvedValue(),
};

jest.mock("knex", () => jest.fn(() => mockKnex));

const { createRunner, freshDatabase, validateRegistry } = require("@src/migrate/core/runner.js");

const migration = (name) => ({ name, transaction: false, up: jest.fn(), down: jest.fn() });

describe("Migration registry 驗證", () => {
    test("接受依名稱排序且不重複的 registry", () => {
        expect(() => validateRegistry([migration("001_first"), migration("002_second")])).not.toThrow();
    });

    test("拒絕重複名稱", () => {
        expect(() => validateRegistry([migration("001_first"), migration("001_first")])).toThrow("名稱重複");
    });

    test("拒絕錯誤順序", () => {
        expect(() => validateRegistry([migration("002_second"), migration("001_first")])).toThrow("順序錯誤");
    });
});

describe("Migration Runner 建立與日誌記錄", () => {
    test("未提供 logger 時拋出錯誤", () => {
        expect(() => createRunner()).toThrow("createRunner 必須提供 logger");
        expect(() => createRunner({})).toThrow("createRunner 必須提供 logger");
        expect(() => createRunner({ logger: {} })).toThrow("createRunner 必須提供 logger");
    });

    test("freshDatabase 未提供 logger 時拋出錯誤", async () => {
        await expect(freshDatabase()).rejects.toThrow("freshDatabase 必須提供 logger");
    });

    test("支援傳入自訂 logger 依賴注入", () => {
        const mockLogger = { info: jest.fn(), error: jest.fn() };
        const runner = createRunner({ logger: mockLogger });
        expect(runner).toHaveProperty("up");
        expect(runner).toHaveProperty("rollback");
        expect(runner).toHaveProperty("unlock");
        expect(runner).toHaveProperty("destroy");
    });

    test("up 成功時會記錄批次執行完成結構化日誌", async () => {
        const mockLogger = { info: jest.fn(), error: jest.fn() };
        const runner = createRunner({ logger: mockLogger });
        await runner.up();
        expect(mockLogger.info).toHaveBeenCalledWith(
            "Migration 批次執行完成",
            expect.objectContaining({ count: 1, migrations: ["m20260912000001CreateUsersTable"] }),
        );
    });

    test("rollback 成功時會記錄批次回滾完成結構化日誌", async () => {
        const mockLogger = { info: jest.fn(), error: jest.fn() };
        const runner = createRunner({ logger: mockLogger });
        await runner.rollback(1);
        expect(mockLogger.info).toHaveBeenCalledWith(
            "Migration 批次回滾完成",
            expect.objectContaining({ count: 1 }),
        );
    });

    test("unlock 成功時會記錄解鎖日誌", async () => {
        const mockLogger = { info: jest.fn(), error: jest.fn() };
        const runner = createRunner({ logger: mockLogger });
        await runner.unlock();
        expect(mockLogger.info).toHaveBeenCalledWith("Migration 鎖定已解除");
    });
});

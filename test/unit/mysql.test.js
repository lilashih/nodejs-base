require("module-alias/register");

const mockPool = {
    execute: jest.fn(),
    getConnection: jest.fn(),
    end: jest.fn(),
};

jest.mock("mysql2/promise", () => ({ createPool: jest.fn(() => mockPool) }));

const db = require("@src/db/mysql.js");

describe("MySQL 資料庫 Helper", () => {
    test("query 會回傳 execute 的資料列", async () => {
        mockPool.execute.mockResolvedValueOnce([[{ id: 1 }], []]);
        await expect(db.query("SELECT id FROM posts WHERE id = ?", [1])).resolves.toEqual([{ id: 1 }]);
        expect(mockPool.execute).toHaveBeenCalledWith("SELECT id FROM posts WHERE id = ?", [1]);
    });

    test("transaction 成功時會 commit 並釋放連線", async () => {
        const connection = {
            beginTransaction: jest.fn(),
            execute: jest.fn().mockResolvedValue([[{ id: 1 }], []]),
            commit: jest.fn(),
            rollback: jest.fn(),
            release: jest.fn(),
        };
        mockPool.getConnection.mockResolvedValueOnce(connection);

        const result = await db.transaction((query) => query("SELECT ? AS id", [1]));
        expect(result).toEqual([{ id: 1 }]);
        expect(connection.commit).toHaveBeenCalled();
        expect(connection.rollback).not.toHaveBeenCalled();
        expect(connection.release).toHaveBeenCalled();
    });

    test("transaction 失敗時會 rollback 並釋放連線", async () => {
        const error = new Error("查詢失敗");
        const connection = {
            beginTransaction: jest.fn(),
            execute: jest.fn().mockRejectedValue(error),
            commit: jest.fn(),
            rollback: jest.fn(),
            release: jest.fn(),
        };
        mockPool.getConnection.mockResolvedValueOnce(connection);

        await expect(db.transaction((query) => query("INVALID"))).rejects.toBe(error);
        expect(connection.rollback).toHaveBeenCalled();
        expect(connection.release).toHaveBeenCalled();
    });
});

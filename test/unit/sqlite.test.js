require("module-alias/register");

describe("SQLite 資料庫介面", () => {
    let db;
    let previousClient;
    let previousFile;

    beforeAll(() => {
        previousClient = process.env.DB_CLIENT;
        previousFile = process.env.SQLITE_FILE;
        process.env.DB_CLIENT = "sqlite";
        process.env.SQLITE_FILE = ":memory:";
        jest.isolateModules(() => {
            db = require("@src/db/index.js");
        });
    });

    afterAll(async () => {
        await db?.close();
        if (previousClient === undefined) delete process.env.DB_CLIENT;
        else process.env.DB_CLIENT = previousClient;
        if (previousFile === undefined) delete process.env.SQLITE_FILE;
        else process.env.SQLITE_FILE = previousFile;
    });

    test("查詢與新增結果採用統一介面", async () => {
        await db.query("CREATE TABLE records (id INTEGER PRIMARY KEY, value TEXT NOT NULL)");
        const result = await db.query("INSERT INTO records (value) VALUES (?)", ["第一筆"]);
        expect(result).toEqual({ insertId: 1, affectedRows: 1 });
        expect(await db.query("SELECT value FROM records WHERE id = ?", [result.insertId]))
            .toEqual([{ value: "第一筆" }]);
    });

    test("交易失敗時回滾，後續查詢仍可執行", async () => {
        await expect(db.transaction(async (query) => {
            await query("INSERT INTO records (value) VALUES (?)", ["應回滾"]);
            throw new Error("交易失敗");
        })).rejects.toThrow("交易失敗");
        expect(await db.query("SELECT value FROM records WHERE value = ?", ["應回滾"]))
            .toEqual([]);
    });

    test("交易內呼叫全域 db.query 不會死鎖並能正常提交", async () => {
        await db.transaction(async () => {
            await db.query("INSERT INTO records (value) VALUES (?)", ["全域呼叫無死鎖"]);
        });
        const rows = await db.query("SELECT value FROM records WHERE value = ?", ["全域呼叫無死鎖"]);
        expect(rows).toEqual([{ value: "全域呼叫無死鎖" }]);
    });
});

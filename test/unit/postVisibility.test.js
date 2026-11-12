require("module-alias/register");

jest.mock("@src/db/index.js", () => ({ query: jest.fn(), transaction: jest.fn() }));
const db = require("@src/db/index.js");
const service = require("@src/http/module/post/service.js");

describe("文章可見範圍", () => {
    beforeEach(() => db.query.mockReset());

    test("公開清單只查已發布文章", async () => {
        db.query.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
        await service.list({ page: 1, perPage: 12 });
        expect(db.query.mock.calls[0][0]).toContain("posts.status = ?");
        expect(db.query.mock.calls[0][1]).toEqual(["published"]);
    });

    test("公開清單傳入 status 參數不會產生衝突條件", async () => {
        db.query.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
        await service.list({ page: 1, perPage: 12, status: "draft" });
        expect(db.query.mock.calls[0][1]).toEqual(["published"]);
    });

    test("作者清單以登入者 ID 篩選", async () => {
        db.query.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);
        await service.listMine({ page: 1, perPage: 12, status: "draft" }, 7);
        expect(db.query.mock.calls[0][0]).toContain("posts.user_id = ?");
        expect(db.query.mock.calls[0][1]).toEqual([7, "draft"]);
    });

    test("公開單篇查詢不回傳草稿", async () => {
        db.query.mockResolvedValueOnce([]);
        await expect(service.getById(4)).rejects.toMatchObject({ httpCode: 404 });
        expect(db.query.mock.calls[0][0]).toContain("posts.status = 'published'");
    });

    test("作者單篇查詢要求文章屬於本人", async () => {
        db.query.mockResolvedValueOnce([]);
        await expect(service.getMineById(4, 7)).rejects.toMatchObject({ httpCode: 404 });
        expect(db.query.mock.calls[0][1]).toEqual([4, 7]);
    });
});

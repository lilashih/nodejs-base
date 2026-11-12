require("module-alias/register");

jest.mock("@src/db/index.js", () => ({ query: jest.fn(), transaction: jest.fn() }));
jest.mock("@src/helper/image.js", () => ({
    isBase64Image: jest.fn((str) => typeof str === "string" && str.startsWith("data:image/")),
    saveBase64Image: jest.fn().mockResolvedValue("/uploads/posts/mocked.png"),
    deleteImageFile: jest.fn().mockResolvedValue(undefined),
}));

const db = require("@src/db/index.js");
const imageHelper = require("@src/helper/image.js");
const service = require("@src/http/module/post/service.js");

describe("文章 Service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("非文章作者不能修改文章", async () => {
        db.query.mockResolvedValueOnce([{ user_id: 2, cover_image: null }]);

        await expect(
            service.update(1, { title: "標題", content: "內容", status: "draft" }, 1),
        ).rejects.toMatchObject({ httpCode: 403 });
    });

    test("文章清單會回傳分頁資料", async () => {
        db.query
            .mockResolvedValueOnce([{ total: 1 }])
            .mockResolvedValueOnce([
                {
                    id: 1,
                    title: "標題",
                    content: "內容",
                    cover_image: "/uploads/posts/1.png",
                    status: "published",
                    user_id: 1,
                    author_name: "作者",
                    created_at: "2026-01-01 00:00:00",
                    updated_at: "2026-01-01 00:00:00",
                },
            ]);

        const result = await service.list({ page: 1, perPage: 20 });
        expect(result.pagination).toEqual({ total: 1, perPage: 20, currentPage: 1, lastPage: 1 });
        expect(result.posts[0]).toMatchObject({
            id: 1,
            userId: 1,
            authorName: "作者",
            coverImage: "/uploads/posts/1.png",
        });
    });

    test("文章清單未指定分頁參數時每頁預設為 100 筆", async () => {
        db.query
            .mockResolvedValueOnce([{ total: 0 }])
            .mockResolvedValueOnce([]);

        const result = await service.list({});

        expect(result.pagination).toEqual({ total: 0, perPage: 100, currentPage: 1, lastPage: 0 });
        expect(db.query).toHaveBeenLastCalledWith(expect.stringContaining("LIMIT ? OFFSET ?"), ["published", 100, 0]);
    });

    test("create 文章帶入 Base64 封面圖時會解碼存檔並寫入資料庫", async () => {
        db.query
            .mockResolvedValueOnce({ insertId: 99 }) // INSERT
            .mockResolvedValueOnce([
                {
                    id: 99,
                    title: "文章標題",
                    content: "文章內容",
                    cover_image: "/uploads/posts/mocked.png",
                    status: "published",
                    user_id: 1,
                    author_name: "作者",
                    created_at: "2026-01-01 00:00:00",
                    updated_at: "2026-01-01 00:00:00",
                },
            ]);

        const result = await service.create(
            {
                title: "文章標題",
                content: "文章內容",
                status: "published",
                coverImage: "data:image/png;base64,mockbase64",
            },
            1,
        );

        expect(imageHelper.saveBase64Image).toHaveBeenCalledWith("data:image/png;base64,mockbase64", "posts");
        expect(db.query).toHaveBeenNthCalledWith(
            1,
            "INSERT INTO posts (title, content, cover_image, status, user_id) VALUES (?, ?, ?, ?, ?)",
            ["文章標題", "文章內容", "/uploads/posts/mocked.png", "published", 1],
        );
        expect(result.coverImage).toBe("/uploads/posts/mocked.png");
    });

    test("update 文章更換封面圖時會儲存新圖並刪除舊圖", async () => {
        db.query
            .mockResolvedValueOnce([{ user_id: 1, cover_image: "/uploads/posts/old.png" }]) // assertOwner
            .mockResolvedValueOnce({}) // UPDATE
            .mockResolvedValueOnce([
                {
                    id: 1,
                    title: "新標題",
                    content: "新內容",
                    cover_image: "/uploads/posts/mocked.png",
                    status: "draft",
                    user_id: 1,
                    author_name: "作者",
                    created_at: "2026-01-01 00:00:00",
                    updated_at: "2026-01-01 00:00:00",
                },
            ]);

        const result = await service.update(
            1,
            {
                title: "新標題",
                content: "新內容",
                status: "draft",
                coverImage: "data:image/png;base64,newbase64",
            },
            1,
        );

        expect(imageHelper.saveBase64Image).toHaveBeenCalledWith("data:image/png;base64,newbase64", "posts");
        expect(imageHelper.deleteImageFile).toHaveBeenCalledWith("/uploads/posts/old.png");
        expect(result.coverImage).toBe("/uploads/posts/mocked.png");
    });

    test("update 文章將封面圖設為 null 時會清空並刪除舊圖", async () => {
        db.query
            .mockResolvedValueOnce([{ user_id: 1, cover_image: "/uploads/posts/old.png" }]) // assertOwner
            .mockResolvedValueOnce({}) // UPDATE
            .mockResolvedValueOnce([
                {
                    id: 1,
                    title: "新標題",
                    content: "新內容",
                    cover_image: null,
                    status: "draft",
                    user_id: 1,
                    author_name: "作者",
                    created_at: "2026-01-01 00:00:00",
                    updated_at: "2026-01-01 00:00:00",
                },
            ]);

        const result = await service.update(
            1,
            {
                title: "新標題",
                content: "新內容",
                status: "draft",
                coverImage: null,
            },
            1,
        );

        expect(imageHelper.deleteImageFile).toHaveBeenCalledWith("/uploads/posts/old.png");
        expect(result.coverImage).toBeNull();
    });

    test("destroy 文章時若有封面圖會一併刪除實體檔案", async () => {
        db.query
            .mockResolvedValueOnce([{ user_id: 1, cover_image: "/uploads/posts/old.png" }]) // assertOwner
            .mockResolvedValueOnce({}); // DELETE

        await service.destroy(1, 1);

        expect(imageHelper.deleteImageFile).toHaveBeenCalledWith("/uploads/posts/old.png");
    });

    test("建立文章資料庫寫入失敗時會清理新上傳的圖片", async () => {
        db.query.mockRejectedValueOnce(new Error("資料庫寫入失敗"));

        await expect(
            service.create({ title: "標題", content: "內容", status: "published", coverImage: "data:image/png;base64,abc" }, 1),
        ).rejects.toThrow("資料庫寫入失敗");

        expect(imageHelper.deleteImageFile).toHaveBeenCalledWith("/uploads/posts/mocked.png");
    });

    test("更新文章資料庫寫入失敗時會清理新上傳的圖片", async () => {
        db.query
            .mockResolvedValueOnce([{ user_id: 1, cover_image: "/uploads/posts/old.png" }])
            .mockRejectedValueOnce(new Error("資料庫更新失敗"));

        await expect(
            service.update(1, { title: "標題", content: "內容", status: "published", coverImage: "data:image/png;base64,abc" }, 1),
        ).rejects.toThrow("資料庫更新失敗");

        expect(imageHelper.deleteImageFile).toHaveBeenCalledWith("/uploads/posts/mocked.png");
    });

    test("搜尋關鍵字會轉義 SQL LIKE 萬用字元", async () => {
        db.query.mockResolvedValueOnce([{ total: 0 }]).mockResolvedValueOnce([]);

        await service.list({ keyword: "100%_test\\done" });

        expect(db.query.mock.calls[0][1]).toContain("%100\\%\\_test\\\\done%");
    });
});


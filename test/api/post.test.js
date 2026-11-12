require("module-alias/register");

jest.mock("@src/http/module/post/service.js", () => ({
    list: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("@src/http/app.js");
const authConfig = require("@src/config/auth.js");
const postService = require("@src/http/module/post/service.js");
const ForbiddenError = require("@src/error/forbiddenError.js");
const NotFoundError = require("@src/error/notFoundError.js");

const createToken = (userId = 1) => jwt.sign({}, authConfig.jwt.secret, {
    algorithm: authConfig.jwt.algorithm,
    subject: String(userId),
    expiresIn: authConfig.jwt.expiresIn,
    issuer: authConfig.jwt.issuer,
    audience: authConfig.jwt.audience,
});

describe("文章 API", () => {
    describe("GET /api/posts 取得文章清單", () => {
        test("文章清單使用預設分頁", async () => {
            postService.list.mockResolvedValue({
                posts: [],
                pagination: { total: 0, perPage: 100, currentPage: 1, lastPage: 0 },
            });
            const response = await request(app).get("/api/posts").expect(200);
            expect(response.body.data.pagination).toEqual({
                total: 0,
                perPage: 100,
                currentPage: 1,
                lastPage: 0,
            });
            expect(postService.list).toHaveBeenCalledWith(expect.objectContaining({
                page: undefined,
                perPage: undefined,
            }));
        });

        test("可帶入分頁、關鍵字與狀態進行查詢", async () => {
            const mockListResult = {
                posts: [
                    {
                        id: 1,
                        title: "Node.js 基礎",
                        content: "內容",
                        status: "published",
                        userId: 1,
                    },
                ],
                pagination: { total: 1, perPage: 10, currentPage: 2, lastPage: 1 },
            };
            postService.list.mockResolvedValue(mockListResult);

            const response = await request(app)
                .get("/api/posts")
                .query({ page: 2, perPage: 10, keyword: "Node.js", status: "published" })
                .expect(200);

            expect(response.body.data).toEqual(mockListResult);
            expect(postService.list).toHaveBeenCalledWith(expect.objectContaining({
                page: 2,
                perPage: 10,
                keyword: "Node.js",
                status: "published",
            }));
        });

        test("查詢參數驗證失敗時回傳 422", async () => {
            const response = await request(app)
                .get("/api/posts")
                .query({ page: 0, perPage: 101, status: "unknown", keyword: "a".repeat(101) })
                .expect(422);

            expect(response.body.data.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: "page" }),
                    expect.objectContaining({ name: "perPage" }),
                    expect.objectContaining({ name: "status" }),
                    expect.objectContaining({ name: "keyword" }),
                ]),
            );
        });

        test("Service 發生未預期錯誤時回傳 500", async () => {
            postService.list.mockRejectedValue(new Error("資料庫查詢失敗"));

            const response = await request(app).get("/api/posts").expect(500);
            expect(response.body.message).toBe("系統發生錯誤");
        });
    });

    describe("GET /api/posts/:id 取得單一文章", () => {
        test("成功取得指定 ID 的文章", async () => {
            const mockPost = {
                id: 1,
                title: "文章標題",
                content: "文章內容",
                status: "published",
                userId: 1,
            };
            postService.getById.mockResolvedValue(mockPost);

            const response = await request(app).get("/api/posts/1").expect(200);

            expect(response.body.data.post).toEqual(mockPost);
            expect(postService.getById).toHaveBeenCalledWith(1);
        });

        test("文章 ID 非正整數時回傳 422", async () => {
            const response = await request(app).get("/api/posts/abc").expect(422);
            expect(response.body.data.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: "id", message: "ID 必須為正整數" }),
                ]),
            );
        });

        test("文章不存在時回傳 404", async () => {
            postService.getById.mockRejectedValue(new NotFoundError("文章"));

            const response = await request(app).get("/api/posts/999").expect(404);
            expect(response.body.message).toBe("查無該文章");
        });

        test("Service 發生未預期錯誤時回傳 500", async () => {
            postService.getById.mockRejectedValue(new Error("資料庫異常"));

            const response = await request(app).get("/api/posts/1").expect(500);
            expect(response.body.message).toBe("系統發生錯誤");
        });
    });

    describe("POST /api/posts 新增文章", () => {
        test("未登入不能新增文章", async () => {
            await request(app)
                .post("/api/posts")
                .send({ title: "標題", content: "內容", status: "draft" })
                .expect(401);
        });

        test("登入後可以新增文章並回傳 201", async () => {
            const post = { id: 1, title: "標題", content: "內容", status: "draft", userId: 1 };
            postService.create.mockResolvedValue(post);

            const response = await request(app)
                .post("/api/posts")
                .set("Authorization", `Bearer ${createToken(1)}`)
                .send({ title: "標題", content: "內容", status: "draft" })
                .expect(201);

            expect(response.body.message).toBe("新增成功");
            expect(response.body.data.post).toMatchObject(post);
            expect(postService.create).toHaveBeenCalledWith(
                expect.objectContaining({ title: "標題", status: "draft" }),
                1,
            );
        });

        test("欄位驗證失敗時回傳 422", async () => {
            const response = await request(app)
                .post("/api/posts")
                .set("Authorization", `Bearer ${createToken(1)}`)
                .send({ title: "", content: "", status: "invalid_status" })
                .expect(422);

            expect(response.body.data.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: "title" }),
                    expect.objectContaining({ name: "content" }),
                    expect.objectContaining({ name: "status" }),
                ]),
            );
        });

        test("標題超過 255 個字元時回傳 422", async () => {
            const response = await request(app)
                .post("/api/posts")
                .set("Authorization", `Bearer ${createToken(1)}`)
                .send({ title: "a".repeat(256), content: "內容", status: "draft" })
                .expect(422);

            expect(response.body.data.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: "title", message: "標題不可超過 255 個字元" }),
                ]),
            );
        });

        test("帶入封面圖 Base64 格式正確時可成功新增文章", async () => {
            const mockBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
            const post = {
                id: 2,
                title: "含封面圖文章",
                content: "文章內容",
                coverImage: "/uploads/posts/mocked.png",
                status: "draft",
                userId: 1,
            };
            postService.create.mockResolvedValue(post);

            const response = await request(app)
                .post("/api/posts")
                .set("Authorization", `Bearer ${createToken(1)}`)
                .send({
                    title: "含封面圖文章",
                    content: "文章內容",
                    status: "draft",
                    coverImage: mockBase64,
                })
                .expect(201);

            expect(response.body.data.post).toMatchObject(post);
            expect(postService.create).toHaveBeenCalledWith(
                expect.objectContaining({ coverImage: mockBase64 }),
                1,
            );
        });

        test("封面圖格式無效時回傳 422", async () => {
            const response = await request(app)
                .post("/api/posts")
                .set("Authorization", `Bearer ${createToken(1)}`)
                .send({
                    title: "標題",
                    content: "內容",
                    status: "draft",
                    coverImage: "invalid-image-data",
                })
                .expect(422);

            expect(response.body.data.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: "coverImage",
                        message: "封面圖片必須為有效的圖片 Base64 或圖片路徑",
                    }),
                ]),
            );
        });

        test("Service 發生未預期錯誤時回傳 500", async () => {
            postService.create.mockRejectedValue(new Error("寫入失敗"));

            const response = await request(app)
                .post("/api/posts")
                .set("Authorization", `Bearer ${createToken(1)}`)
                .send({ title: "標題", content: "內容", status: "draft" })
                .expect(500);

            expect(response.body.message).toBe("系統發生錯誤");
        });
    });


    describe("PUT /api/posts/:id 更新文章", () => {
        test("未登入時無法更新文章", async () => {
            await request(app)
                .put("/api/posts/1")
                .send({ title: "新標題", content: "新內容", status: "published" })
                .expect(401);
        });

        test("ID 或欄位驗證失敗時回傳 422", async () => {
            const response = await request(app)
                .put("/api/posts/invalid-id")
                .set("Authorization", `Bearer ${createToken(1)}`)
                .send({ title: "", content: "", status: "wrong" })
                .expect(422);

            expect(response.body.data.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: "id" }),
                    expect.objectContaining({ name: "title" }),
                    expect.objectContaining({ name: "content" }),
                    expect.objectContaining({ name: "status" }),
                ]),
            );
        });

        test("登入後且為作者可成功更新文章", async () => {
            const updatedPost = {
                id: 1,
                title: "更新後標題",
                content: "更新後內容",
                status: "published",
                userId: 1,
            };
            postService.update.mockResolvedValue(updatedPost);

            const response = await request(app)
                .put("/api/posts/1")
                .set("Authorization", `Bearer ${createToken(1)}`)
                .send({ title: "更新後標題", content: "更新後內容", status: "published" })
                .expect(200);

            expect(response.body.message).toBe("更新成功");
            expect(response.body.data.post).toEqual(updatedPost);
            expect(postService.update).toHaveBeenCalledWith(
                1,
                expect.objectContaining({
                    id: 1,
                    title: "更新後標題",
                    content: "更新後內容",
                    status: "published",
                }),
                1,
            );
        });

        test("文章不存在時回傳 404", async () => {
            postService.update.mockRejectedValue(new NotFoundError("文章"));

            const response = await request(app)
                .put("/api/posts/999")
                .set("Authorization", `Bearer ${createToken(1)}`)
                .send({ title: "標題", content: "內容", status: "published" })
                .expect(404);

            expect(response.body.message).toBe("查無該文章");
        });

        test("非作者嘗試更新時回傳 403", async () => {
            postService.update.mockRejectedValue(new ForbiddenError("只能操作自己建立的文章"));

            const response = await request(app)
                .put("/api/posts/1")
                .set("Authorization", `Bearer ${createToken(2)}`)
                .send({ title: "標題", content: "內容", status: "published" })
                .expect(403);

            expect(response.body.message).toBe("只能操作自己建立的文章");
        });

        test("更新文章時可更換封面圖或設定為 null", async () => {
            const mockBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
            const updatedPost = {
                id: 1,
                title: "更新標題",
                content: "更新內容",
                coverImage: "/uploads/posts/mocked.png",
                status: "published",
                userId: 1,
            };
            postService.update.mockResolvedValue(updatedPost);

            const response = await request(app)
                .put("/api/posts/1")
                .set("Authorization", `Bearer ${createToken(1)}`)
                .send({
                    title: "更新標題",
                    content: "更新內容",
                    status: "published",
                    coverImage: mockBase64,
                })
                .expect(200);

            expect(response.body.data.post).toMatchObject(updatedPost);
            expect(postService.update).toHaveBeenCalledWith(
                1,
                expect.objectContaining({ coverImage: mockBase64 }),
                1,
            );
        });

        test("Service 發生未預期錯誤時回傳 500", async () => {
            postService.update.mockRejectedValue(new Error("更新失敗"));

            const response = await request(app)
                .put("/api/posts/1")
                .set("Authorization", `Bearer ${createToken(1)}`)
                .send({ title: "標題", content: "內容", status: "published" })
                .expect(500);

            expect(response.body.message).toBe("系統發生錯誤");
        });
    });


    describe("DELETE /api/posts/:id 刪除文章", () => {
        test("未登入時無法刪除文章", async () => {
            await request(app).delete("/api/posts/1").expect(401);
        });

        test("ID 驗證失敗時回傳 422", async () => {
            const response = await request(app)
                .delete("/api/posts/not-an-id")
                .set("Authorization", `Bearer ${createToken(1)}`)
                .expect(422);

            expect(response.body.data.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: "id", message: "ID 必須為正整數" }),
                ]),
            );
        });

        test("登入後且為作者可成功刪除文章", async () => {
            postService.destroy.mockResolvedValue();

            const response = await request(app)
                .delete("/api/posts/1")
                .set("Authorization", `Bearer ${createToken(1)}`)
                .expect(200);

            expect(response.body.message).toBe("刪除成功");
            expect(response.body.data).toEqual({});
            expect(postService.destroy).toHaveBeenCalledWith(1, 1);
        });

        test("文章不存在時回傳 404", async () => {
            postService.destroy.mockRejectedValue(new NotFoundError("文章"));

            const response = await request(app)
                .delete("/api/posts/999")
                .set("Authorization", `Bearer ${createToken(1)}`)
                .expect(404);

            expect(response.body.message).toBe("查無該文章");
        });

        test("非作者嘗試刪除時回傳 403", async () => {
            postService.destroy.mockRejectedValue(new ForbiddenError("只能操作自己建立的文章"));

            const response = await request(app)
                .delete("/api/posts/1")
                .set("Authorization", `Bearer ${createToken(2)}`)
                .expect(403);

            expect(response.body.message).toBe("只能操作自己建立的文章");
        });

        test("Service 發生未預期錯誤時回傳 500", async () => {
            postService.destroy.mockRejectedValue(new Error("刪除失敗"));

            const response = await request(app)
                .delete("/api/posts/1")
                .set("Authorization", `Bearer ${createToken(1)}`)
                .expect(500);

            expect(response.body.message).toBe("系統發生錯誤");
        });
    });
});

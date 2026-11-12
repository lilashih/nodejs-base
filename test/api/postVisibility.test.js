require("module-alias/register");

jest.mock("@src/http/module/post/service.js", () => ({
    list: jest.fn(),
    listMine: jest.fn(),
    getById: jest.fn(),
    getMineById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("@src/http/app.js");
const authConfig = require("@src/config/auth.js");
const service = require("@src/http/module/post/service.js");

const token = (userId) => jwt.sign({}, authConfig.jwt.secret, {
    algorithm: authConfig.jwt.algorithm,
    subject: String(userId),
    expiresIn: authConfig.jwt.expiresIn,
    issuer: authConfig.jwt.issuer,
    audience: authConfig.jwt.audience,
});

describe("作者文章 API", () => {
    test("未登入無法讀取自己的文章", async () => {
        const listResponse = await request(app).get("/api/posts/mine").expect(401);
        expect(listResponse.body).toEqual({
            message: "請先登入",
            data: {},
        });
        const detailResponse = await request(app).get("/api/posts/mine/1").expect(401);
        expect(detailResponse.body).toEqual({
            message: "請先登入",
            data: {},
        });
    });

    test("清單只傳入驗證後的登入者 ID", async () => {
        service.listMine.mockResolvedValue({ posts: [], pagination: { total: 0, perPage: 12, currentPage: 1, lastPage: 0 } });
        await request(app).get("/api/posts/mine").set("Authorization", `Bearer ${token(7)}`).expect(200);
        expect(service.listMine).toHaveBeenCalledWith(expect.any(Object), 7);
    });

    test("單篇文章只傳入驗證後的登入者 ID", async () => {
        service.getMineById.mockResolvedValue({ id: 4, status: "draft", userId: 7 });
        await request(app).get("/api/posts/mine/4").set("Authorization", `Bearer ${token(7)}`).expect(200);
        expect(service.getMineById).toHaveBeenCalledWith(4, 7);
    });
});

require("module-alias/register");

jest.mock("@src/http/module/auth/service.js", () => ({
    register: jest.fn(),
    login: jest.fn(),
    getById: jest.fn(),
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("@src/http/app.js");
const authConfig = require("@src/config/auth.js");
const authService = require("@src/http/module/auth/service.js");
const ConflictError = require("@src/error/conflictError.js");
const NotFoundError = require("@src/error/notFoundError.js");
const UnauthorizedError = require("@src/error/unauthorizedError.js");

const createToken = (userId = 1, options = {}) => jwt.sign({}, authConfig.jwt.secret, {
    algorithm: authConfig.jwt.algorithm,
    subject: String(userId),
    expiresIn: options.expiresIn ?? authConfig.jwt.expiresIn,
    issuer: authConfig.jwt.issuer,
    audience: authConfig.jwt.audience,
});

describe("認證 API", () => {
    describe("POST /api/auth/register 註冊", () => {
        test("資料正確時成功註冊並回傳 201", async () => {
            const mockUser = {
                id: 1,
                name: "測試使用者",
                email: "test@example.com",
                createdAt: "2026-01-01 00:00:00",
                updatedAt: "2026-01-01 00:00:00",
            };
            const mockResult = { user: mockUser, token: "mock-jwt-token" };
            authService.register.mockResolvedValue(mockResult);

            const response = await request(app)
                .post("/api/auth/register")
                .send({
                    name: "測試使用者",
                    email: "test@example.com",
                    password: "password123",
                })
                .expect(201);

            expect(response.body.message).toBe("註冊成功");
            expect(response.body.data).toEqual(mockResult);
            expect(authService.register).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "測試使用者",
                    email: "test@example.com",
                    password: "password123",
                }),
            );
        });

        test("欄位驗證失敗時回傳 422", async () => {
            const response = await request(app)
                .post("/api/auth/register")
                .send({
                    name: "",
                    email: "invalid-email",
                    password: "short",
                })
                .expect(422);

            expect(response.body.data.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: "name" }),
                    expect.objectContaining({ name: "email" }),
                    expect.objectContaining({ name: "password" }),
                ]),
            );
            expect(authService.register).not.toHaveBeenCalled();
        });

        test("姓名超過 100 個字元時回傳 422", async () => {
            const response = await request(app)
                .post("/api/auth/register")
                .send({
                    name: "a".repeat(101),
                    email: "test@example.com",
                    password: "password123",
                })
                .expect(422);

            expect(response.body.data.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: "name", message: "姓名不可超過 100 個字元" }),
                ]),
            );
        });

        test("密碼超過 72 個字元時回傳 422", async () => {
            const response = await request(app)
                .post("/api/auth/register")
                .send({
                    name: "測試使用者",
                    email: "test@example.com",
                    password: "a".repeat(73),
                })
                .expect(422);

            expect(response.body.data.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: "password", message: "密碼長度必須介於 8 到 72 個字元" }),
                ]),
            );
        });

        test("電子郵件已被註冊時回傳 409", async () => {
            authService.register.mockRejectedValue(new ConflictError("電子郵件已被使用"));

            const response = await request(app)
                .post("/api/auth/register")
                .send({
                    name: "測試使用者",
                    email: "duplicate@example.com",
                    password: "password123",
                })
                .expect(409);

            expect(response.body.message).toBe("電子郵件已被使用");
        });

        test("資料庫發生重複鍵 (ER_DUP_ENTRY) 時回傳 409", async () => {
            const dbError = new Error("Duplicate entry");
            dbError.code = "ER_DUP_ENTRY";
            authService.register.mockRejectedValue(dbError);

            const response = await request(app)
                .post("/api/auth/register")
                .send({
                    name: "測試使用者",
                    email: "duplicate@example.com",
                    password: "password123",
                })
                .expect(409);

            expect(response.body.message).toBe("資料已存在");
        });

        test("發生未預期錯誤時回傳 500", async () => {
            authService.register.mockRejectedValue(new Error("資料庫連線中斷"));

            const response = await request(app)
                .post("/api/auth/register")
                .send({
                    name: "測試使用者",
                    email: "error@example.com",
                    password: "password123",
                })
                .expect(500);

            expect(response.body.message).toBe("系統發生錯誤");
        });
    });

    describe("POST /api/auth/login 登入", () => {
        test("帳號密碼正確時成功登入並回傳 200", async () => {
            const mockUser = {
                id: 1,
                name: "測試使用者",
                email: "test@example.com",
                createdAt: "2026-01-01 00:00:00",
                updatedAt: "2026-01-01 00:00:00",
            };
            const mockResult = { user: mockUser, token: "mock-jwt-token" };
            authService.login.mockResolvedValue(mockResult);

            const response = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "test@example.com",
                    password: "password123",
                })
                .expect(200);

            expect(response.body.message).toBe("登入成功");
            expect(response.body.data).toEqual(mockResult);
            expect(authService.login).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: "test@example.com",
                    password: "password123",
                }),
            );
        });

        test("欄位缺失或格式不合時回傳 422", async () => {
            const response = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "not-an-email",
                    password: "",
                })
                .expect(422);

            expect(response.body.data.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: "email" }),
                    expect.objectContaining({ name: "password" }),
                ]),
            );
            expect(authService.login).not.toHaveBeenCalled();
        });

        test("帳號或密碼錯誤時回傳 401", async () => {
            authService.login.mockRejectedValue(new UnauthorizedError("電子郵件或密碼錯誤"));

            const response = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "wrong@example.com",
                    password: "wrongpassword",
                })
                .expect(401);

            expect(response.body.message).toBe("電子郵件或密碼錯誤");
        });

        test("發生未預期錯誤時回傳 500", async () => {
            authService.login.mockRejectedValue(new Error("資料庫故障"));

            const response = await request(app)
                .post("/api/auth/login")
                .send({
                    email: "error@example.com",
                    password: "password123",
                })
                .expect(500);

            expect(response.body.message).toBe("系統發生錯誤");
        });
    });

    describe("GET /api/auth/me 目前使用者資訊", () => {
        test("未帶 Token 時回傳 401", async () => {
            const response = await request(app).get("/api/auth/me").expect(401);
            expect(response.body.message).toBe("請先登入");
        });

        test("帶入無效 Token 時回傳 401", async () => {
            const response = await request(app)
                .get("/api/auth/me")
                .set("Authorization", "Bearer invalid-token-string")
                .expect(401);

            expect(response.body.message).toBe("Token 無效或已過期");
        });

        test("帶入已過期 Token 時回傳 401", async () => {
            const expiredToken = createToken(1, { expiresIn: -10 });
            const response = await request(app)
                .get("/api/auth/me")
                .set("Authorization", `Bearer ${expiredToken}`)
                .expect(401);

            expect(response.body.message).toBe("Token 無效或已過期");
        });

        test("帶入有效 Token 時成功取得使用者資訊", async () => {
            const mockUser = {
                id: 1,
                name: "測試使用者",
                email: "test@example.com",
                createdAt: "2026-01-01 00:00:00",
                updatedAt: "2026-01-01 00:00:00",
            };
            authService.getById.mockResolvedValue(mockUser);

            const token = createToken(1);
            const response = await request(app)
                .get("/api/auth/me")
                .set("Authorization", `Bearer ${token}`)
                .expect(200);

            expect(response.body.data.user).toEqual(mockUser);
            expect(authService.getById).toHaveBeenCalledWith(1);
        });

        test("使用者不存在時回傳 404", async () => {
            authService.getById.mockRejectedValue(new NotFoundError("使用者"));

            const token = createToken(999);
            const response = await request(app)
                .get("/api/auth/me")
                .set("Authorization", `Bearer ${token}`)
                .expect(404);

            expect(response.body.message).toBe("查無該使用者");
        });

        test("發生未預期錯誤時回傳 500", async () => {
            authService.getById.mockRejectedValue(new Error("未知的系統異常"));

            const token = createToken(1);
            const response = await request(app)
                .get("/api/auth/me")
                .set("Authorization", `Bearer ${token}`)
                .expect(500);

            expect(response.body.message).toBe("系統發生錯誤");
        });
    });
});

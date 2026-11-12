require("module-alias/register");

jest.mock("@src/http/module/auth/service.js", () => ({
    register: jest.fn(),
    login: jest.fn(),
    getById: jest.fn(),
}));

const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("@src/http/app.js");
const config = require("@src/config/auth.js");
const service = require("@src/http/module/auth/service.js");

const user = { id: 7, name: "測試使用者", email: "test@example.com" };
const token = (options = {}) => jwt.sign({}, config.jwt.secret, {
    algorithm: config.jwt.algorithm,
    subject: String(user.id),
    expiresIn: options.expiresIn ?? config.jwt.expiresIn,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
});
const loginInput = { email: user.email, password: "password123" };
const registerInput = { ...loginInput, name: user.name };

describe("Cookie Session 認證", () => {
    test("登入設定 HttpOnly Cookie，回應不包含 token", async () => {
        service.login.mockResolvedValue({ user, token: token() });
        const response = await request(app).post("/api/auth/session/login").send(loginInput).expect(200);
        const cookie = response.headers["set-cookie"][0];
        expect(response.body.data).toEqual({ user });
        expect(cookie).toContain("token=");
        expect(cookie).toContain("Path=/api");
        expect(cookie).toContain("HttpOnly");
        expect(cookie).toContain("SameSite=Lax");
        expect(cookie).toMatch(/Max-Age=3[56]\d\d/);
    });

    test("註冊設定 Cookie，登出清除 Cookie", async () => {
        service.register.mockResolvedValue({ user, token: token() });
        const registered = await request(app).post("/api/auth/session/register").send(registerInput).expect(201);
        expect(registered.body.data).toEqual({ user });
        expect(registered.headers["set-cookie"][0]).toContain("HttpOnly");
        const logout = await request(app).post("/api/auth/session/logout").expect(200);
        expect(logout.headers["set-cookie"][0]).toContain("Path=/api");
        expect(logout.headers["set-cookie"][0]).toContain("Expires=");
    });

    test("Cookie 優先於 Bearer；Cookie 無效時不回退 Bearer", async () => {
        service.getById.mockResolvedValue(user);
        const valid = token();
        await request(app).get("/api/auth/me").set("Cookie", `token=${valid}`)
            .set("Authorization", "Bearer invalid").expect(200);
        await request(app).get("/api/auth/me").set("Cookie", "token=invalid")
            .set("Authorization", `Bearer ${valid}`).expect(401);
        await request(app).get("/api/auth/me").set("Authorization", `Bearer ${valid}`).expect(200);
        await request(app).get("/api/auth/me").set("Cookie", `token=${token({ expiresIn: -10 })}`).expect(401);
    });

    test("Cookie 寫入須同源，Bearer 寫入維持可用", async () => {
        const valid = token();
        await request(app).post("/api/posts").set("Host", "example.test")
            .set("Cookie", `token=${valid}`).send({}).expect(403);
        await request(app).post("/api/posts").set("Host", "example.test")
            .set("Cookie", `token=${valid}`).set("Origin", "https://other.test").send({}).expect(403);
        await request(app).post("/api/posts").set("Host", "example.test")
            .set("Cookie", `token=${valid}`).set("Origin", "https://example.test").send({}).expect(422);
        await request(app).post("/api/posts").set("Host", "example.test")
            .set("Cookie", `token=${valid}`).set("Referer", "https://example.test/app/").send({}).expect(422);
        await request(app).post("/api/posts").set("Authorization", `Bearer ${valid}`).send({}).expect(422);
    });
});

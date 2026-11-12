require("module-alias/register");

const request = require("supertest");
const app = require("@src/http/app.js");

describe("基礎 API 與中介軟體", () => {
    describe("GET /api/health 健康檢查", () => {
        test("健康檢查會回傳 package.json 版本與狀態", async () => {
            const packageJson = require("../../package.json");
            const response = await request(app).get("/api/health").expect(200);

            expect(response.body.data).toMatchObject({
                name: packageJson.name,
                version: packageJson.version,
                status: "ok",
            });
            expect(response.headers["x-request-id"]).toBeTruthy();
        });
    });

    describe("未授權訪問保護", () => {
        test("未帶 Token 時無法讀取目前使用者", async () => {
            const response = await request(app).get("/api/auth/me").expect(401);
            expect(response.body.message).toBe("請先登入");
        });
    });

    describe("404 路由處理", () => {
        test("不存在的 API 會回傳 404 與一致的錯誤結構", async () => {
            const response = await request(app).get("/api/not-exists").expect(404);
            expect(response.body).toEqual({
                message: "查無該路徑",
                data: {},
            });
        });
    });

    describe("API 文件 (Swagger UI)", () => {
        test("測試環境下可讀取 Swagger UI 文件", async () => {
            const response = await request(app).get("/apidoc/").expect(200);
            expect(response.text).toContain("Swagger UI");
        });
    });

    describe("CORS 中介軟體", () => {
        test("OPTIONS 預檢請求會回傳 204 與相關允許表頭", async () => {
            const response = await request(app)
                .options("/api/health")
                .set("Origin", "http://localhost:3000")
                .expect(204);

            expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
            expect(response.headers["access-control-allow-credentials"]).toBe("true");
            expect(response.headers["access-control-allow-methods"]).toBe(
                "GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS",
            );
            expect(response.headers["access-control-max-age"]).toBe("86400");
        });

        test("允許的 Origin 在一般請求中會設定 Access-Control-Allow-Origin", async () => {
            const response = await request(app)
                .get("/api/health")
                .set("Origin", "http://localhost:3000")
                .expect(200);

            expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
            expect(response.headers["access-control-allow-credentials"]).toBe("true");
        });

        test("非允許的 Origin 不會設定 Access-Control-Allow-Origin", async () => {
            const response = await request(app)
                .get("/api/health")
                .set("Origin", "http://not-allowed.example.com")
                .expect(200);

            expect(response.headers["access-control-allow-origin"]).toBeUndefined();
            expect(response.headers.vary).toContain("Origin");
        });
    });
});

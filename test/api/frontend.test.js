require("module-alias/register");

const request = require("supertest");
const app = require("@src/http/app.js");

describe("同一個 Port 的前端路由", () => {
    test("根路徑與 /app 導向前端首頁", async () => {
        await request(app).get("/").expect(302).expect("Location", "/app/");
        await request(app).get("/app").expect(302).expect("Location", "/app/");
    });

    test("首頁與深層頁面取得同一份 HTML", async () => {
        const home = await request(app).get("/app/").set("Accept", "text/html").expect(200);
        const detail = await request(app).get("/app/posts/create").set("Accept", "text/html").expect(200);
        expect(home.headers["content-type"]).toMatch(/text\/html/);
        expect(home.headers["cache-control"]).toBe("no-cache");
        expect(detail.text).toBe(home.text);
    });

    test("既有資源有正確內容類型，缺失資源不回傳 HTML", async () => {
        const css = await request(app).get("/app/assets/example.css").expect(200).expect("Content-Type", /text\/css/);
        expect(css.headers["cache-control"]).toContain("immutable");
        const missing = await request(app).get("/app/assets/missing.js").set("Accept", "text/html").expect(404);
        expect(missing.text).not.toContain("前端測試頁");
    });

    test("API 與其他路徑不進入 SPA 回退", async () => {
        const api = await request(app).get("/api/missing").set("Accept", "text/html").expect(404);
        expect(api.headers["content-type"]).toMatch(/application\/json/);
        await request(app).get("/application").set("Accept", "text/html").expect(404);
        await request(app).post("/app/posts/create").expect(404);
        await request(app).get("/uploads/missing.png").expect(404);
    });
});

describe("內嵌記憶體模式的前端路由", () => {
    const express = require("express");
    const { registerFrontendRoutes } = require("@src/http/route/frontendRoute.js");

    let embeddedApp;
    const mockAssets = {
        "index.html": {
            contentType: "text/html; charset=utf-8",
            etag: '"test-index-etag"',
            content: Buffer.from("<!DOCTYPE html><html><body>內嵌前端頁面</body></html>"),
        },
        "assets/main.css": {
            contentType: "text/css; charset=utf-8",
            etag: '"test-css-etag"',
            content: Buffer.from("body { color: red; }"),
        },
    };

    const mockEmbeddedModule = {
        hasEmbeddedFrontend: true,
        embeddedAssets: mockAssets,
        getEmbeddedAsset: (assetPath) => mockAssets[assetPath] ?? null,
        getEmbeddedIndex: () => mockAssets["index.html"] ?? null,
    };

    beforeEach(() => {
        embeddedApp = express();
        registerFrontendRoutes(embeddedApp, {
            forceEmbedded: true,
            embeddedAssets: mockEmbeddedModule,
        });
    });

    test("內嵌模式下根路徑導向 /app/", async () => {
        await request(embeddedApp).get("/").expect(302).expect("Location", "/app/");
        await request(embeddedApp).get("/app").expect(302).expect("Location", "/app/");
    });

    test("內嵌模式下存取首頁與深層 SPA 頁面取得內嵌 HTML", async () => {
        const response = await request(embeddedApp).get("/app/").set("Accept", "text/html").expect(200);
        expect(response.headers["content-type"]).toMatch(/text\/html/);
        expect(response.headers["etag"]).toBe('"test-index-etag"');
        expect(response.headers["cache-control"]).toBe("no-cache");
        expect(response.text).toContain("內嵌前端頁面");

        const deep = await request(embeddedApp).get("/app/posts/create").set("Accept", "text/html").expect(200);
        expect(deep.text).toBe(response.text);
    });

    test("內嵌模式下 ETag 相符時回傳 304 Not Modified", async () => {
        await request(embeddedApp)
            .get("/app/")
            .set("If-None-Match", '"test-index-etag"')
            .expect(304);

        await request(embeddedApp)
            .get("/app/assets/main.css")
            .set("If-None-Match", '"test-css-etag"')
            .expect(304);
    });

    test("內嵌靜態資源具備正確 Content-Type 與長效 Cache-Control", async () => {
        const response = await request(embeddedApp).get("/app/assets/main.css").expect(200);
        expect(response.headers["content-type"]).toMatch(/text\/css/);
        expect(response.headers["cache-control"]).toContain("immutable");
        expect(response.text).toBe("body { color: red; }");
    });

    test("內嵌模式下不存在的靜態檔案回傳 404", async () => {
        await request(embeddedApp).get("/app/assets/nonexistent.js").expect(404);
    });
});

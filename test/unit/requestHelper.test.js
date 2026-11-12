require("module-alias/register");

const { request } = require("@src/helper/request.js");

describe("第三方 HTTP Request Helper", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("GET 會組合 query string 並回傳統一格式", async () => {
        global.fetch = jest.fn().mockResolvedValue(
            new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            }),
        );

        const response = await request("GET", "https://example.com/posts", { page: 2, tag: ["a", "b"] });

        expect(global.fetch.mock.calls[0][0]).toBe("https://example.com/posts?page=2&tag=a&tag=b");
        expect(response).toMatchObject({ httpCode: 200, data: { ok: true }, method: "GET" });
        expect(response).not.toHaveProperty("status");
        expect(response).not.toHaveProperty("statusCode");
    });

    test("物件 request body 預設使用 JSON", async () => {
        global.fetch = jest.fn().mockResolvedValue(new Response(null, { status: 204 }));
        await request("POST", "https://example.com/posts", { title: "文章" });

        expect(global.fetch.mock.calls[0][1]).toMatchObject({
            method: "POST",
            body: JSON.stringify({ title: "文章" }),
            headers: { "Content-Type": "application/json" },
        });
    });

    test("非 2xx 回應會轉為 RequestError", async () => {
        global.fetch = jest.fn().mockResolvedValue(
            new Response(JSON.stringify({ message: "失敗" }), { status: 400 }),
        );

        const error = await request("GET", "https://example.com/error").catch((caughtError) => caughtError);

        expect(error).toMatchObject({
            name: "RequestError",
            httpCode: 400,
            message: "第三方請求失敗（HTTP 400）",
            data: { message: "失敗" },
            response: { httpCode: 400 },
        });
        expect(error).not.toHaveProperty("statusCode");
        expect(error).not.toHaveProperty("code");
    });

    test("逾時會轉為 408 RequestError", async () => {
        const timeoutError = new Error("逾時");
        timeoutError.name = "TimeoutError";
        global.fetch = jest.fn().mockRejectedValue(timeoutError);

        const error = await request("GET", "https://example.com/slow").catch((caughtError) => caughtError);

        expect(error).toMatchObject({
            name: "RequestError",
            httpCode: 408,
            cause: timeoutError,
        });
        expect(error).not.toHaveProperty("statusCode");
        expect(error).not.toHaveProperty("code");
    });

    test("網路錯誤保留原始 cause 與原生 code", async () => {
        const networkError = new Error("連線中斷");
        networkError.code = "ECONNRESET";
        global.fetch = jest.fn().mockRejectedValue(networkError);

        const error = await request("GET", "https://example.com/disconnected").catch((caughtError) => caughtError);

        expect(error).toMatchObject({
            name: "RequestError",
            httpCode: 500,
            cause: networkError,
        });
        expect(error).not.toHaveProperty("code");
        expect(error.cause.code).toBe("ECONNRESET");
    });
    test("呼叫端取消會中止請求，且與逾時分開標示", async () => {
        const controller = new AbortController();
        global.fetch = jest.fn((url, options) => new Promise((resolve, reject) => {
            options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
        }));

        const pending = request("GET", "https://example.com/private?token=demo-secret", null, {}, {
            signal: controller.signal,
            timeout: 1000,
        });
        controller.abort(new DOMException("已取消", "AbortError"));
        const error = await pending.catch((caughtError) => caughtError);

        expect(error).toMatchObject({ name: "RequestError", httpCode: 499, errorType: "cancelled" });
        expect(global.fetch.mock.calls[0][1].signal.aborted).toBe(true);
        expect(error.url).toBe("https://example.com");
        expect(error.response.url).toBe("https://example.com");
        expect(error.message).not.toContain("demo-secret");
    });

    test("呼叫端訊號未取消時仍會因逾時中止請求並回傳 408", async () => {
        const controller = new AbortController();
        global.fetch = jest.fn((url, options) => new Promise((resolve, reject) => {
            options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
        }));

        const error = await request("GET", "https://example.com/private?token=demo-secret", null, {}, {
            timeout: 5,
            signal: controller.signal,
        }).catch((caughtError) => caughtError);

        expect(error).toMatchObject({ name: "RequestError", httpCode: 408, errorType: "timeout" });
        expect(error.url).toBe("https://example.com");
        expect(error.message).not.toContain("demo-secret");
    });

    test.each([0, -1, 1.5, Infinity, NaN, "1000"])("拒絕無效逾時值 %s", async (timeout) => {
        global.fetch = jest.fn();
        await expect(request("GET", "https://example.com", null, {}, { timeout }))
            .rejects.toThrow("options.timeout");
        expect(global.fetch).not.toHaveBeenCalled();
    });

    test("HTTP 錯誤不將網址的帳密、路徑及 query 放入錯誤欄位", async () => {
        global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ message: "失敗" }), { status: 403 }));
        const error = await request("GET", "https://user:password@example.com/private-token?key=demo-secret")
            .catch((caughtError) => caughtError);

        expect(error.url).toBe("https://example.com");
        expect(error.response.url).toBe("https://example.com");
        expect(error.message).not.toMatch(/password|private-token|demo-secret/);
    });
});

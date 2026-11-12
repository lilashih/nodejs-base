require("module-alias/register");

const {
    runRequestContext,
    getRequestContext,
    setClientIp,
    setUserId,
} = require("@src/helper/requestContext.js");
const {
    requestContextMiddleware,
    normalizeIp,
} = require("@src/http/middleware/requestContextMiddleware.js");

describe("Request Context 請求上下文", () => {
    test("並行請求資料不會互相污染", async () => {
        const run = (requestId, userId) => runRequestContext({ requestId }, async () => {
            setClientIp(`127.0.0.${userId}`);
            setUserId(userId);
            await Promise.resolve();
            return getRequestContext();
        });

        const [first, second] = await Promise.all([run("first", 1), run("second", 2)]);
        expect(first).toMatchObject({ requestId: "first", userId: 1, clientIp: "127.0.0.1" });
        expect(second).toMatchObject({ requestId: "second", userId: 2, clientIp: "127.0.0.2" });
    });

    describe("normalizeIp IP 正規化函式", () => {
        test("空值或無效值回傳空字串", () => {
            expect(normalizeIp()).toBe("");
            expect(normalizeIp(null)).toBe("");
            expect(normalizeIp("   ")).toBe("");
        });

        test("IPv6 本地端映射 ::1 轉為 127.0.0.1", () => {
            expect(normalizeIp("::1")).toBe("127.0.0.1");
        });

        test("去除 ::ffff: 前綴", () => {
            expect(normalizeIp("::ffff:192.168.1.100")).toBe("192.168.1.100");
        });

        test("一般 IPv4 維持原樣", () => {
            expect(normalizeIp("203.0.113.1")).toBe("203.0.113.1");
        });
    });

    describe("requestContextMiddleware 請求上下文中介軟體", () => {
        test("設定 X-Request-Id 標頭並初始化 Context", (done) => {
            const req = {
                method: "GET",
                originalUrl: "/api/test",
                ip: "::ffff:192.168.0.50",
            };
            const headers = {};
            const res = {
                setHeader: (key, value) => {
                    headers[key] = value;
                },
            };

            requestContextMiddleware(req, res, () => {
                const store = getRequestContext();
                expect(headers["X-Request-Id"]).toBeDefined();
                expect(store).toMatchObject({
                    requestId: headers["X-Request-Id"],
                    method: "GET",
                    url: "/api/test",
                    clientIp: "192.168.0.50",
                });
                done();
            });
        });
    });
});

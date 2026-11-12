require("module-alias/register");

const AppError = require("@src/error/appError.js");
const NotFoundError = require("@src/error/notFoundError.js");
const logger = require("@src/logger/instance/appLogger.js");
const { errorMiddleware } = require("@src/http/middleware/errorMiddleware.js");

const buildResponse = () => {
    const res = {
        headersSent: false,
        status: jest.fn(),
        json: jest.fn(),
    };
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
    return res;
};

describe("AppError 自訂例外", () => {
    test("使用預設 httpCode 且不設定 code", () => {
        const error = new AppError("請求錯誤");

        expect(error).toMatchObject({
            name: "AppError",
            message: "請求錯誤",
            httpCode: 400,
            data: {},
        });
        expect(error).not.toHaveProperty("code");
    });

    test("保存指定 httpCode、data 與 cause", () => {
        const cause = new Error("底層錯誤");
        const error = new AppError("服務錯誤", {
            httpCode: 503,
            data: { retry: true },
            cause,
        });

        expect(error).toMatchObject({
            httpCode: 503,
            data: { retry: true },
            cause,
        });
    });

    test.each([399, 600, "500"])("拒絕無效 httpCode：%s", (httpCode) => {
        expect(() => new AppError("錯誤", { httpCode })).toThrow("httpCode 必須是 400 至 599 的整數");
    });

    test("NotFoundError 使用 404", () => {
        expect(new NotFoundError("文章")).toMatchObject({
            httpCode: 404,
            message: "查無該文章",
        });
    });
});

describe("Error Middleware 錯誤中介軟體", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("AppError 使用 httpCode 回應", () => {
        const res = buildResponse();

        errorMiddleware(new NotFoundError("文章"), {}, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            message: "查無該文章",
            data: {},
        });
    });

    test("MySQL 重複資料錯誤回應 409", () => {
        const res = buildResponse();
        const error = Object.assign(new Error("Duplicate entry"), { code: "ER_DUP_ENTRY" });

        errorMiddleware(error, {}, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({
            message: "資料已存在",
            data: {},
        });
    });

    test.each([
        { code: "SQLITE_CONSTRAINT_UNIQUE" },
        { code: "ERR_SQLITE_ERROR", errcode: 2067 },
    ])("SQLite 重複資料錯誤回應 409：%p", (details) => {
        const res = buildResponse();
        const error = Object.assign(new Error("UNIQUE constraint failed"), details);

        errorMiddleware(error, {}, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({ message: "資料已存在", data: {} });
    });

    test("未預期錯誤回應 500 且不洩漏內部資訊", () => {
        const res = buildResponse();
        const error = Object.assign(new Error("SQL 連線失敗"), {
            code: "ECONNRESET",
            data: { sql: "SELECT secret" },
        });
        jest.spyOn(logger, "error").mockImplementation(() => logger);

        errorMiddleware(error, {}, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            message: "系統發生錯誤",
            data: {},
        });
        expect(logger.error).toHaveBeenCalledWith("未預期的系統錯誤", expect.objectContaining({
            code: "ECONNRESET",
        }));
    });

    test("Response 已送出時交回 Express", () => {
        const res = buildResponse();
        const next = jest.fn();
        res.headersSent = true;
        const error = new Error("已送出");

        errorMiddleware(error, {}, res, next);

        expect(next).toHaveBeenCalledWith(error);
        expect(res.status).not.toHaveBeenCalled();
    });
});

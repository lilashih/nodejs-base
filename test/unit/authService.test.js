require("module-alias/register");

jest.mock("@src/db/index.js", () => ({ query: jest.fn(), transaction: jest.fn() }));

const bcrypt = require("bcryptjs");
const db = require("@src/db/index.js");
const service = require("@src/http/module/auth/service.js");

describe("認證 Service", () => {
    test("登入成功時不回傳密碼雜湊並簽發 JWT", async () => {
        const passwordHash = await bcrypt.hash("password123", 4);
        db.query.mockResolvedValueOnce([
            {
                id: 1,
                name: "測試使用者",
                email: "user@example.com",
                password: passwordHash,
                created_at: "2026-01-01 00:00:00",
                updated_at: "2026-01-01 00:00:00",
            },
        ]);

        const result = await service.login({ email: "USER@example.com", password: "password123" });

        expect(result.user.passwordHash).toBeUndefined();
        expect(result.token).toEqual(expect.any(String));
        expect(db.query).toHaveBeenCalledWith(expect.any(String), ["user@example.com"]);
    });

    test("密碼錯誤時回傳未授權錯誤", async () => {
        db.query.mockResolvedValueOnce([]);
        await expect(service.login({ email: "user@example.com", password: "wrong" })).rejects.toMatchObject({ httpCode: 401 });
    });
});

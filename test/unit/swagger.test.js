require("module-alias/register");

const packageJson = require("../../package.json");
const { openApiDocument } = require("@src/swagger/swagger.js");

describe("OpenAPI 文件", () => {
    test("包含基礎 API 並使用 package.json 版本", () => {
        expect(openApiDocument.info.version).toBe(packageJson.version);
        expect(openApiDocument.paths).toEqual(
            expect.objectContaining({
                "/health": expect.any(Object),
                "/auth/register": expect.any(Object),
                "/auth/login": expect.any(Object),
                "/auth/me": expect.any(Object),
                "/posts": expect.any(Object),
                "/posts/{id}": expect.any(Object),
            }),
        );
    });
});

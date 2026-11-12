require("module-alias/register");

const path = require("path");
const { appRoot, isBundledExecutable, resolveAppPath } = require("@src/helper/file.js");

describe("檔案路徑 Helper (file.js)", () => {
    test("在 Node.js 環境下預設 appRoot 為專案根目錄", () => {
        expect(appRoot).toBe(path.resolve(__dirname, "../../"));
    });

    test("在 Node.js 執行時 isBundledExecutable 為 false", () => {
        expect(isBundledExecutable).toBe(false);
    });

    test("resolveAppPath 能正確將路徑片段與 appRoot 組合", () => {
        const expectedPath = path.join(appRoot, "storage", "log");
        expect(resolveAppPath("storage", "log")).toBe(expectedPath);
    });
});

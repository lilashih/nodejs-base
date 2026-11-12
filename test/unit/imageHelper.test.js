require("module-alias/register");

const fs = require("fs/promises");
const path = require("path");
const imageHelper = require("@src/helper/image.js");
const uploadConfig = require("@src/config/upload.js");
const { resolveAppPath } = require("@src/helper/file.js");
const ValidationError = require("@src/error/validationError.js");

describe("圖片處理 Helper (image.js)", () => {
    const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
    ]);
    const webpBuffer = Buffer.concat([
        Buffer.from("RIFF"),
        Buffer.alloc(4),
        Buffer.from("WEBP"),
    ]);
    const invalidBuffer = Buffer.from("not-an-image-file-content");

    describe("detectImageType 圖片類型偵測", () => {
        test("能正確辨識 PNG 格式", () => {
            expect(imageHelper.detectImageType(pngBuffer)).toEqual({ mime: "image/png", ext: "png" });
        });

        test("能正確辨識 JPEG 格式", () => {
            expect(imageHelper.detectImageType(jpegBuffer)).toEqual({ mime: "image/jpeg", ext: "jpg" });
        });

        test("能正確辨識 WebP 格式", () => {
            expect(imageHelper.detectImageType(webpBuffer)).toEqual({ mime: "image/webp", ext: "webp" });
        });

        test("非支援圖片格式時回傳 null", () => {
            expect(imageHelper.detectImageType(invalidBuffer)).toBeNull();
            expect(imageHelper.detectImageType(null)).toBeNull();
        });
    });

    describe("isBase64Image 判斷函式", () => {
        test("有效 Data URL 回傳 true", () => {
            const dataUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`;
            expect(imageHelper.isBase64Image(dataUrl)).toBe(true);
        });

        test("無效格式回傳 false", () => {
            expect(imageHelper.isBase64Image("/uploads/posts/abc.png")).toBe(false);
            expect(imageHelper.isBase64Image("data:text/plain;base64,SGVsbG8=")).toBe(false);
            expect(imageHelper.isBase64Image(null)).toBe(false);
            expect(imageHelper.isBase64Image("")).toBe(false);
        });
    });

    describe("saveBase64Image 與 deleteImageFile 圖片儲存與刪除", () => {
        let createdFileUrl = null;

        afterEach(async () => {
            if (createdFileUrl) {
                await imageHelper.deleteImageFile(createdFileUrl);
                createdFileUrl = null;
            }
        });

        test("成功存檔並回傳相對公開路徑", async () => {
            const dataUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`;
            createdFileUrl = await imageHelper.saveBase64Image(dataUrl, "test_posts");

            expect(createdFileUrl).toMatch(/^\/uploads\/test_posts\/[a-f0-9-]+\.png$/);

            // 確認檔案實際存在
            const subPath = createdFileUrl.slice(uploadConfig.publicUrlPrefix.length);
            const absolutePath = path.resolve(resolveAppPath(uploadConfig.storageDir), `.${subPath}`);
            const stat = await fs.stat(absolutePath);
            expect(stat.isFile()).toBe(true);
        });

        test("圖片格式不支援時拋出 ValidationError", async () => {
            const dataUrl = `data:image/png;base64,${invalidBuffer.toString("base64")}`;
            await expect(imageHelper.saveBase64Image(dataUrl, "test_posts")).rejects.toThrow(ValidationError);
        });

        test("檔案超過大小限制時拋出 ValidationError", async () => {
            const originalMax = uploadConfig.maxFileSizeBytes;
            uploadConfig.maxFileSizeBytes = 5; // 限制為 5 bytes
            try {
                const dataUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`;
                await expect(imageHelper.saveBase64Image(dataUrl, "test_posts")).rejects.toThrow(ValidationError);
            } finally {
                uploadConfig.maxFileSizeBytes = originalMax;
            }
        });

        test("deleteImageFile 成功刪除檔案，且重複刪除不會報錯", async () => {
            const dataUrl = `data:image/png;base64,${pngBuffer.toString("base64")}`;
            const fileUrl = await imageHelper.saveBase64Image(dataUrl, "test_posts");

            await expect(imageHelper.deleteImageFile(fileUrl)).resolves.not.toThrow();
            // 重複刪除不存在的檔案亦不拋錯
            await expect(imageHelper.deleteImageFile(fileUrl)).resolves.not.toThrow();
        });

        test("deleteImageFile 面對跨目錄（路徑遍歷）時安全略過", async () => {
            await expect(imageHelper.deleteImageFile("/uploads/../../package.json")).resolves.not.toThrow();
            // 確認 package.json 沒有被刪除
            const stat = await fs.stat(resolveAppPath("package.json"));
            expect(stat.isFile()).toBe(true);
        });
    });
});


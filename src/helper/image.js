const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const uploadConfig = require("@src/config/upload.js");
const ValidationError = require("@src/error/validationError.js");
const { resolveAppPath } = require("@src/helper/file.js");

// 檢查 Buffer 的 Magic Number 以辨識真實圖片類型
const detectImageType = (buffer) => {
    if (!buffer || buffer.length < 4) return null;

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        buffer.length >= 8
        && buffer[0] === 0x89
        && buffer[1] === 0x50
        && buffer[2] === 0x4e
        && buffer[3] === 0x47
        && buffer[4] === 0x0d
        && buffer[5] === 0x0a
        && buffer[6] === 0x1a
        && buffer[7] === 0x0a
    ) {
        return { mime: "image/png", ext: "png" };
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return { mime: "image/jpeg", ext: "jpg" };
    }

    // WebP: RIFF .... WEBP
    if (
        buffer.length >= 12
        && buffer.toString("ascii", 0, 4) === "RIFF"
        && buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
        return { mime: "image/webp", ext: "webp" };
    }

    return null;
};

// 判斷字串是否符合 Base64 Data URL 格式
const isBase64Image = (value) => {
    if (typeof value !== "string") return false;
    return /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(value.trim());
};

// 解析 Base64 字串為 Buffer
const parseBase64ToBuffer = (dataUrl) => {
    const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    const base64Data = matches ? matches[2] : dataUrl;
    return Buffer.from(base64Data, "base64");
};

// 儲存 Base64 圖片至檔案系統
const saveBase64Image = async (dataUrl, subDir = "posts") => {
    if (!dataUrl) return null;

    const buffer = parseBase64ToBuffer(dataUrl);

    // 檢查檔案大小
    if (buffer.length > uploadConfig.maxFileSizeBytes) {
        const maxSizeMb = (uploadConfig.maxFileSizeBytes / (1024 * 1024)).toFixed(1);
        throw new ValidationError([
            { name: "coverImage", message: `封面圖片大小不可超過 ${maxSizeMb} MB` },
        ]);
    }

    // 檢查檔案簽章（Magic Number）
    const detected = detectImageType(buffer);
    if (!detected || !uploadConfig.allowedMimeTypes.includes(detected.mime)) {
        throw new ValidationError([
            { name: "coverImage", message: "封面圖片格式錯誤，僅支援 JPG、PNG 或 WebP 格式" },
        ]);
    }

    const filename = `${crypto.randomUUID()}.${detected.ext}`;
    const targetDir = resolveAppPath(uploadConfig.storageDir, subDir);
    await fs.mkdir(targetDir, { recursive: true });

    const targetPath = path.join(targetDir, filename);
    await fs.writeFile(targetPath, buffer);

    // 回傳前端可存取的相對公開路徑
    return `${uploadConfig.publicUrlPrefix}/${subDir}/${filename}`;
};

// 安全刪除圖片實體檔案（防止目錄遍歷）
const deleteImageFile = async (relativeUrl) => {
    if (!relativeUrl || typeof relativeUrl !== "string") return;

    // 僅處理符合 uploadConfig.publicUrlPrefix 的本機檔案
    if (!relativeUrl.startsWith(uploadConfig.publicUrlPrefix)) return;

    const subPath = relativeUrl.slice(uploadConfig.publicUrlPrefix.length);
    const storageRoot = resolveAppPath(uploadConfig.storageDir);
    const fullPath = path.resolve(storageRoot, `.${subPath}`);

    // 防止目錄遍歷，確保路徑在儲存根目錄內
    if (!fullPath.startsWith(storageRoot)) return;

    try {
        await fs.unlink(fullPath);
    } catch (error) {
        // 檔案不存在則忽略
        if (error.code !== "ENOENT") {
            throw error;
        }
    }
};

module.exports = {
    detectImageType,
    isBase64Image,
    parseBase64ToBuffer,
    saveBase64Image,
    deleteImageFile,
};


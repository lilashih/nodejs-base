module.exports = {
    storageDir: "storage/uploads",
    publicUrlPrefix: "/uploads",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxFileSizeBytes: Number(process.env.UPLOAD_MAX_FILE_SIZE ?? 2 * 1024 * 1024), // 預設 2MB
    jsonLimit: process.env.UPLOAD_JSON_LIMIT ?? "10mb",
};


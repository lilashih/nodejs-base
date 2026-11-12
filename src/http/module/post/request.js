const { body, query } = require("express-validator");
const coreRequest = require("@src/http/common/request.js");

const statuses = ["draft", "published"];
const postBody = [
    body("title", "標題為必填欄位").trim().notEmpty().isLength({ max: 255 }).withMessage("標題不可超過 255 個字元"),
    body("content", "內容為必填欄位").isString().notEmpty(),
    body("status", "文章狀態格式錯誤").isIn(statuses),
    body("coverImage")
        .optional({ nullable: true })
        .custom((value) => {
            if (value === null || value === "") return true;
            if (typeof value !== "string") throw new Error("封面圖片格式錯誤");
            const isDataUrl = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(value.trim());
            const isUrlOrPath = /^(https?:\/\/|\/uploads\/)/.test(value.trim()) && value.trim().length <= 255;
            if (!isDataUrl && !isUrlOrPath) {
                throw new Error("封面圖片必須為有效的圖片 Base64 或圖片路徑");
            }
            return true;
        }),
];


const listRequest = [
    ...coreRequest.paginationQuery,
    query("keyword").optional().trim().isLength({ max: 100 }).withMessage("搜尋關鍵字不可超過 100 個字元"),
    query("status", "文章狀態格式錯誤").optional().isIn(statuses),
];

module.exports = { idRequest: coreRequest.idParam, listRequest, postBody };

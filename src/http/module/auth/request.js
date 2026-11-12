const { body } = require("express-validator");

const registerRequest = [
    body("name", "姓名為必填欄位").trim().notEmpty().isLength({ max: 100 }).withMessage("姓名不可超過 100 個字元"),
    body("email", "電子郵件格式錯誤").trim().isEmail().normalizeEmail(),
    body("password", "密碼長度必須介於 8 到 72 個字元").isString().isLength({ min: 8, max: 72 }),
];

const loginRequest = [
    body("email", "電子郵件格式錯誤").trim().isEmail().normalizeEmail(),
    body("password", "密碼為必填欄位").isString().notEmpty(),
];

module.exports = { registerRequest, loginRequest };

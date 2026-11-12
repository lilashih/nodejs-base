const { param, query } = require("express-validator");

module.exports = {
    idParam: [param("id", "ID 必須為正整數").isInt({ min: 1 }).toInt()],
    paginationQuery: [
        query("page", "page 必須為正整數").optional().isInt({ min: 1 }).toInt(),
        query("perPage", "perPage 必須介於 1 到 100").optional().isInt({ min: 1, max: 100 }).toInt(),
    ],
};

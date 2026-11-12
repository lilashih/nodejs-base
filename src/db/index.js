const config = require("@src/config/db.js");

module.exports = config.client === "sqlite"
    ? require("@src/db/sqlite.js")
    : require("@src/db/mysql.js");

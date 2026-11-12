const fs = require("fs");
const path = require("path");
const { sqlite: config } = require("@src/config/db.js");

const openDatabase = (filename = config.filename) => {
    if (filename !== ":memory:") {
        fs.mkdirSync(path.dirname(filename), { recursive: true });
    }

    const database = process.versions?.bun
        ? new (require("bun:sqlite").Database)(filename)
        : new (require("node:sqlite").DatabaseSync)(filename);
    database.exec("PRAGMA journal_mode = WAL");
    database.exec("PRAGMA synchronous = NORMAL");
    database.exec("PRAGMA busy_timeout = 5000");
    database.exec("PRAGMA foreign_keys = ON");
    return database;
};

const normalizeValues = (values) => values.map((value) => value === undefined ? null : value);
const execute = (database, sql, values = []) => {
    const statement = database.prepare(sql);
    const bindings = normalizeValues(values);
    if (/^\s*(SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(sql)) {
        return statement.all(...bindings);
    }
    const result = statement.run(...bindings);
    return {
        insertId: Number(result.lastInsertRowid ?? result.lastInsertRowid64 ?? 0),
        affectedRows: result.changes,
    };
};

module.exports = { openDatabase, execute };

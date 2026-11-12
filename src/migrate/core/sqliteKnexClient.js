const SqliteClient = require("knex/lib/dialects/sqlite3");
const { openDatabase } = require("@src/db/sqliteNative.js");

const normalizeBindings = (values = []) => values.map((value) => {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "boolean") return Number(value);
    return value;
});

class SqliteKnexClient extends SqliteClient {
    _driver() {
        return {};
    }

    async acquireRawConnection() {
        const database = openDatabase(this.connectionSettings.filename);
        return {
            all(sql, values, callback) {
                try {
                    const rows = database.prepare(sql).all(...normalizeBindings(values ?? []));
                    callback(null, rows);
                } catch (error) {
                    callback(error);
                }
            },
            run(sql, values, callback) {
                try {
                    const result = database.prepare(sql).run(...normalizeBindings(values ?? []));
                    callback.call({
                        lastID: Number(result.lastInsertRowid ?? 0),
                        changes: result.changes,
                    }, null);
                } catch (error) {
                    callback(error);
                }
            },
            close(callback) {
                try {
                    database.close();
                    callback();
                } catch (error) {
                    callback(error);
                }
            },
        };
    }
}

module.exports = SqliteKnexClient;

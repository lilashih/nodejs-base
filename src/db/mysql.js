const mysql = require("mysql2/promise");
const { mysql: config } = require("@src/config/db.js");

const pool = mysql.createPool({
    ...config,
    waitForConnections: true,
    queueLimit: 0,
    dateStrings: true,
    decimalNumbers: true,
});

const query = async (sql, values = []) => {
    const [rows] = await pool.execute(sql, values);
    return rows;
};

const testConnection = async () => {
    await query("SELECT 1 AS connected");
};

const transaction = async (callback) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        const transactionQuery = async (sql, values = []) => {
            const [rows] = await connection.execute(sql, values);
            return rows;
        };
        const result = await callback(transactionQuery);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const close = async () => {
    await pool.end();
};

module.exports = { pool, query, testConnection, transaction, close };

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("@src/db/index.js");
const config = require("@src/config/auth.js");
const ConflictError = require("@src/error/conflictError.js");
const NotFoundError = require("@src/error/notFoundError.js");
const UnauthorizedError = require("@src/error/unauthorizedError.js");

const mapUser = (row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const createToken = (userId) => {
    return jwt.sign({}, config.jwt.secret, {
        algorithm: config.jwt.algorithm,
        subject: String(userId),
        expiresIn: config.jwt.expiresIn,
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
    });
};

const register = async ({ name, email, password }) => {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUsers = await db.query("SELECT id FROM users WHERE email = ? LIMIT 1", [normalizedEmail]);
    if (existingUsers.length > 0) throw new ConflictError("電子郵件已被使用");

    const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);
    const result = await db.query(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        [name, normalizedEmail, passwordHash],
    );
    const user = await getById(result.insertId);
    return { user, token: createToken(user.id) };
};

const login = async ({ email, password }) => {
    const users = await db.query(
        "SELECT id, name, email, password, created_at, updated_at FROM users WHERE email = ? LIMIT 1",
        [email.trim().toLowerCase()],
    );
    const user = users[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new UnauthorizedError("電子郵件或密碼錯誤");
    }

    return { user: mapUser(user), token: createToken(user.id) };
};

const getById = async (id) => {
    const users = await db.query(
        "SELECT id, name, email, created_at, updated_at FROM users WHERE id = ? LIMIT 1",
        [id],
    );
    if (!users[0]) throw new NotFoundError("使用者");
    return mapUser(users[0]);
};

module.exports = { register, login, getById, createToken, mapUser };

const db = require("@src/db/index.js");
const ForbiddenError = require("@src/error/forbiddenError.js");
const NotFoundError = require("@src/error/notFoundError.js");
const { createPagination } = require("@src/helper/pagination.js");
const { isBase64Image, saveBase64Image, deleteImageFile } = require("@src/helper/image.js");

const mapPost = (row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    coverImage: row.cover_image ?? null,
    status: row.status,
    userId: row.user_id,
    authorName: row.author_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const escapeLike = (value) => value.replace(/[%_\\]/g, "\\$&");

const listPosts = async ({ page = 1, perPage = 100, keyword, status }, userId = null) => {
    const conditions = userId === null ? ["posts.status = ?"] : ["posts.user_id = ?"];
    const values = userId === null ? ["published"] : [userId];

    if (keyword) {
        conditions.push("(posts.title LIKE ? OR posts.content LIKE ?)");
        const escapedKeyword = escapeLike(keyword);
        values.push(`%${escapedKeyword}%`, `%${escapedKeyword}%`);
    }
    if (status && userId !== null) {
        conditions.push("posts.status = ?");
        values.push(status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const offset = (page - 1) * perPage;
    const countRows = await db.query(`SELECT COUNT(*) AS total FROM posts ${where}`, values);
    const rows = await db.query(
        `SELECT posts.id, posts.title, posts.content, posts.cover_image, posts.status, posts.user_id,
                posts.created_at, posts.updated_at, users.name AS author_name
         FROM posts
         INNER JOIN users ON users.id = posts.user_id
         ${where}
         ORDER BY posts.id DESC
         LIMIT ? OFFSET ?`,
        [...values, perPage, offset],
    );

    return {
        posts: rows.map(mapPost),
        pagination: createPagination({
            total: countRows[0].total,
            perPage,
            currentPage: page,
        }),
    };
};

const list = (filters) => listPosts(filters);
const listMine = (filters, userId) => listPosts(filters, userId);

const getById = async (id) => {
    const rows = await db.query(
        `SELECT posts.id, posts.title, posts.content, posts.cover_image, posts.status, posts.user_id,
                posts.created_at, posts.updated_at, users.name AS author_name
         FROM posts
         INNER JOIN users ON users.id = posts.user_id
         WHERE posts.id = ? AND posts.status = 'published' LIMIT 1`,
        [id],
    );
    if (!rows[0]) throw new NotFoundError("文章");
    return mapPost(rows[0]);
};

const getMineById = async (id, userId) => {
    const rows = await db.query(
        `SELECT posts.id, posts.title, posts.content, posts.cover_image, posts.status, posts.user_id,
                posts.created_at, posts.updated_at, users.name AS author_name
         FROM posts
         INNER JOIN users ON users.id = posts.user_id
         WHERE posts.id = ? AND posts.user_id = ? LIMIT 1`,
        [id, userId],
    );
    if (!rows[0]) throw new NotFoundError("文章");
    return mapPost(rows[0]);
};

const create = async (data, userId) => {
    let coverImagePath = null;
    let newlySavedImage = null;
    if (data.coverImage) {
        if (isBase64Image(data.coverImage)) {
            newlySavedImage = await saveBase64Image(data.coverImage, "posts");
            coverImagePath = newlySavedImage;
        } else {
            coverImagePath = data.coverImage;
        }
    }

    try {
        const result = await db.query(
            "INSERT INTO posts (title, content, cover_image, status, user_id) VALUES (?, ?, ?, ?, ?)",
            [data.title, data.content, coverImagePath, data.status, userId],
        );
        return await getMineById(result.insertId, userId);
    } catch (error) {
        if (newlySavedImage) {
            await deleteImageFile(newlySavedImage).catch(() => {});
        }
        throw error;
    }
};

const assertOwner = async (id, userId) => {
    const rows = await db.query("SELECT user_id, cover_image FROM posts WHERE id = ? LIMIT 1", [id]);
    if (!rows[0]) throw new NotFoundError("文章");
    if (Number(rows[0].user_id) !== Number(userId)) throw new ForbiddenError("只能操作自己建立的文章");
    return rows[0];
};

const update = async (id, data, userId) => {
    const oldPost = await assertOwner(id, userId);
    let newCoverImage = oldPost.cover_image;
    let newlySavedImage = null;
    let shouldDeleteOldImage = false;

    if (data.coverImage !== undefined) {
        if (isBase64Image(data.coverImage)) {
            newlySavedImage = await saveBase64Image(data.coverImage, "posts");
            newCoverImage = newlySavedImage;
            shouldDeleteOldImage = Boolean(oldPost.cover_image && oldPost.cover_image !== newCoverImage);
        } else if (data.coverImage === null || data.coverImage === "") {
            newCoverImage = null;
            shouldDeleteOldImage = Boolean(oldPost.cover_image);
        } else {
            newCoverImage = data.coverImage;
        }
    }

    try {
        await db.query("UPDATE posts SET title = ?, content = ?, cover_image = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [
            data.title,
            data.content,
            newCoverImage,
            data.status,
            id,
        ]);

        if (shouldDeleteOldImage) {
            await deleteImageFile(oldPost.cover_image);
        }

        return await getMineById(id, userId);
    } catch (error) {
        if (newlySavedImage) {
            await deleteImageFile(newlySavedImage).catch(() => {});
        }
        throw error;
    }
};

const destroy = async (id, userId) => {
    const oldPost = await assertOwner(id, userId);
    await db.query("DELETE FROM posts WHERE id = ?", [id]);
    if (oldPost.cover_image) {
        await deleteImageFile(oldPost.cover_image);
    }
};

module.exports = { list, listMine, getById, getMineById, create, update, destroy, mapPost };


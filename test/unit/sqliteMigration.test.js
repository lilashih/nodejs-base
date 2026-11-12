require("module-alias/register");

describe("SQLite Migration 資料庫遷移", () => {
    test("文章建表將 user_id 預設為 0，且不建立外鍵", async () => {
        const knex = require("knex")({
            client: require("@src/migrate/core/sqliteKnexClient.js"),
            connection: { filename: ":memory:" },
            useNullAsDefault: true,
            pool: { min: 1, max: 1 },
        });
        try {
            await require("@src/migrate/migrations/m202609080001CreateUsersTable.js").up(knex);
            await require("@src/migrate/migrations/m202609080002CreatePostsTable.js").up(knex);

            const columns = await knex.raw("PRAGMA table_info(posts)");
            const userId = columns.find((column) => column.name === "user_id");
            expect(userId.notnull).toBe(1);
            expect(await knex.raw("PRAGMA foreign_key_list(posts)")).toEqual([]);

            await knex.raw("INSERT INTO users DEFAULT VALUES");
            const user = await knex("users").first("name", "email", "password");
            expect(user).toEqual({ name: "", email: "", password: "" });

            await knex.raw("INSERT INTO posts DEFAULT VALUES");
            const post = await knex("posts").first("user_id", "title", "content", "cover_image", "status");
            expect(post).toEqual({ user_id: 0, title: "", content: "", cover_image: "", status: "" });
        } finally {
            await knex.destroy();
        }
    });

    test("可建立資料表、回滾並重新套用", async () => {
        const previousClient = process.env.DB_CLIENT;
        const previousFile = process.env.SQLITE_FILE;
        process.env.DB_CLIENT = "sqlite";
        process.env.SQLITE_FILE = ":memory:";

        let createRunner;
        try {
            jest.isolateModules(() => {
                ({ createRunner } = require("@src/migrate/core/runner.js"));
            });
            const logger = { info: jest.fn(), error: jest.fn() };
            const runner = createRunner({ logger });
            try {
                await runner.up();
                await runner.rollback();
                await runner.up();
            } finally {
                await runner.destroy();
            }
        } finally {
            if (previousClient === undefined) delete process.env.DB_CLIENT;
            else process.env.DB_CLIENT = previousClient;
            if (previousFile === undefined) delete process.env.SQLITE_FILE;
            else process.env.SQLITE_FILE = previousFile;
        }
    });
});

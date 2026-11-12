const name = "202609080002_create_posts_table";

const up = (knex) => knex.schema.createTable("posts", (table) => {
    if (knex.client.dialect !== "sqlite3") {
        table.charset("utf8mb4");
        table.collate("utf8mb4_unicode_ci");
    }
    table.increments("id").unsigned().primary();
    table.integer("user_id").unsigned().notNullable().defaultTo(0);
    table.string("title", 255).notNullable().defaultTo("");
    table.text("content").nullable().defaultTo("");
    table.string("cover_image", 255).nullable().defaultTo("");
    table.string("status", 50).notNullable().defaultTo("");
    table.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    
    table.index("user_id", "posts_user_id_index");
    table.index("status", "posts_status_index");
});

const down = (knex) => knex.schema.dropTable("posts");

module.exports = { name, transaction: false, up, down };

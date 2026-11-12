const name = "202609080001_create_users_table";

const up = (knex) => knex.schema.createTable("users", (table) => {
    if (knex.client.dialect !== "sqlite3") {
        table.charset("utf8mb4");
        table.collate("utf8mb4_unicode_ci");
    }
    table.increments("id").unsigned().primary();
    table.string("name", 100).notNullable().defaultTo("");
    table.string("email", 255).notNullable().defaultTo("").unique("users_email_unique");
    table.string("password", 255).notNullable().defaultTo("");
    table.dateTime("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
});

const down = (knex) => knex.schema.dropTable("users");

module.exports = { name, transaction: false, up, down };

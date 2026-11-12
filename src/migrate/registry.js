const createUsersTable = require("@src/migrate/migrations/m202609080001CreateUsersTable.js");
const createPostsTable = require("@src/migrate/migrations/m202609080002CreatePostsTable.js");

module.exports = [createUsersTable, createPostsTable];


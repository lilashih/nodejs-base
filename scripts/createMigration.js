const fs = require("fs");
const path = require("path");

const inputName = process.argv[2];
if (!inputName || !/^[a-z][A-Za-z0-9]*$/.test(inputName)) {
    console.error("請提供 camelCase 名稱，例如：pnpm migrate:create addPostCategory");
    process.exit(1);
}

const now = new Date();
const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
].join("");
const pascalName = inputName[0].toUpperCase() + inputName.slice(1);
const snakeName = inputName.replace(/[A-Z]/g, (character) => `_${character.toLowerCase()}`);
const fileName = `m${timestamp}${pascalName}.js`;
const target = path.resolve(__dirname, "..", "src", "migrate", "migrations", fileName);
const content = `const name = "${timestamp}_${snakeName}";

const up = (knex) => {
    // 請使用 Knex Schema Builder 實作向上遷移。
};

const down = (knex) => {
    // 請使用 Knex Schema Builder 實作回滾。
};

module.exports = { name, transaction: false, up, down };
`;

fs.writeFileSync(target, content, { encoding: "utf8", flag: "wx" });
console.log(`已建立 ${target}`);
console.log("請將新 Migration 明確加入 src/migrate/registry.js。\n");

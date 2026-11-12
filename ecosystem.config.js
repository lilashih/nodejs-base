const fs = require("fs");
const packageJson = require("./package.json");

const envExists = fs.existsSync(".env");

module.exports = {
    apps: [
        {
            name: packageJson.name,
            script: "./src/app.js",
            node_args: envExists ? "--env-file=.env" : "",
            ignore_watch: ["node_modules", "storage", "test", "frontend", "release"],
            max_memory_restart: "500M",
            max_restarts: 5,
            log_file: "./storage/log/pm2/pm2.log",
            time: true,
            log_date_format: "YYYY-MM-DD HH:mm Z",
        },
    ],
};

const fs = require("fs");
const path = require("path");
const DailyRotateFile = require("winston-daily-rotate-file");

const padNumber = (value) => String(value).padStart(2, "0");

const formatDate = (date) => [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate()),
].join("-");

class DailyRotate extends DailyRotateFile {
    constructor(options) {
        super(options);
        this.configuredFilename = options.filename;
    }

    getCurrentFilename() {
        return this.configuredFilename.replace(/%DATE%/g, formatDate(new Date()));
    }

    log(info, callback) {
        const currentFilename = this.getCurrentFilename();
        fs.mkdirSync(path.dirname(currentFilename), { recursive: true });

        if (!fs.existsSync(currentFilename)) {
            this.logStream.emit("createLog", currentFilename);
        }

        super.log(info, callback);
    }
}

module.exports = DailyRotate;

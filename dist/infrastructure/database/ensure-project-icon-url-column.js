"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(process.cwd(), 'properties.env') });
const data_source_1 = require("./data-source");
async function main() {
    await data_source_1.default.initialize();
    try {
        const rows = (await data_source_1.default.query(`SELECT COUNT(*) AS c FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'icon_url'`));
        const c = Number(rows[0]?.c ?? 0);
        if (c > 0) {
            console.log('OK: projects.icon_url already exists.');
            return;
        }
        await data_source_1.default.query('ALTER TABLE `projects` ADD COLUMN `icon_url` MEDIUMTEXT NULL AFTER `description`');
        console.log('OK: Added column projects.icon_url. Restart the API and retry.');
    }
    finally {
        await data_source_1.default.destroy();
    }
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=ensure-project-icon-url-column.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join(process.cwd(), 'properties.env') });
const typeorm_1 = require("typeorm");
const configuration_1 = require("../../../config/configuration");
const user_entity_1 = require("../../../modules/users/entities/user.entity");
const SEED_EMAILS = ['owner@example.com', 'member@example.com', 'admin@example.com'];
const PASSWORD = process.env.SEED_USER_PASSWORD || 'Password123!';
async function main() {
    const dbConfig = (0, configuration_1.configuration)().database;
    const dataSource = new typeorm_1.DataSource({
        type: 'mysql',
        host: dbConfig.host,
        port: dbConfig.port,
        username: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.database,
        entities: [user_entity_1.UserEntity],
        synchronize: false,
    });
    await dataSource.initialize();
    const repo = dataSource.getRepository(user_entity_1.UserEntity);
    for (const email of SEED_EMAILS) {
        const user = await repo.findOne({ where: { email } });
        if (!user) {
            console.log(`  Skip (not found): ${email}`);
            continue;
        }
        await repo.update(user.id, {
            passwordHash: PASSWORD,
            isEmailVerified: true,
        });
        console.log(`  Updated: ${email} (verified + password from SEED_USER_PASSWORD or default)`);
    }
    await dataSource.destroy();
    console.log('\nDone. Login with any of:', SEED_EMAILS.join(', '));
    console.log(`Password: ${PASSWORD === 'Password123!' ? 'Password123! (default)' : '(value of SEED_USER_PASSWORD in properties.env)'}\n`);
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=fix-seed-users-login.js.map
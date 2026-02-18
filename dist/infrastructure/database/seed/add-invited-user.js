"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const bcrypt = require("bcrypt");
const configuration_1 = require("../../../config/configuration");
const uuid_util_1 = require("../../../common/utils/uuid.util");
const user_entity_1 = require("../../../modules/users/entities/user.entity");
const EMAIL = process.env.SEED_INVITED_EMAIL || 'invitee@example.com';
const PASSWORD = process.env.SEED_USER_PASSWORD || 'Password123!';
async function addUser() {
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
        logging: dbConfig.logging ?? false,
    });
    await dataSource.initialize();
    console.log(`Adding user: ${EMAIL}`);
    const hash = await bcrypt.hash(PASSWORD, 10);
    const userRepo = dataSource.getRepository(user_entity_1.UserEntity);
    const existing = await userRepo.findOne({ where: { email: EMAIL.toLowerCase() } });
    if (existing) {
        console.log(`User ${EMAIL} already exists. You can login with this email.`);
        await dataSource.destroy();
        return;
    }
    await userRepo.save(userRepo.create({
        id: (0, uuid_util_1.generateUuid)(),
        email: EMAIL.toLowerCase(),
        fullName: EMAIL.split('@')[0],
        passwordHash: hash,
    }));
    await dataSource.destroy();
    console.log(`\nUser created. Login with:`);
    console.log(`  Email:    ${EMAIL}`);
    console.log(`  Password: ${PASSWORD}`);
    console.log(`\nThen open your invitation link and click "Accept Invitation".`);
}
addUser().catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
});
//# sourceMappingURL=add-invited-user.js.map
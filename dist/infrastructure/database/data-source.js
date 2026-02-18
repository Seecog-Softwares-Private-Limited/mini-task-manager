"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const configuration_1 = require("../../config/configuration");
const config = (0, configuration_1.configuration)();
const db = config.database;
exports.default = new typeorm_1.DataSource({
    type: 'mysql',
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    synchronize: db.synchronize,
    logging: db.logging,
    extra: db.extra,
});
//# sourceMappingURL=data-source.js.map
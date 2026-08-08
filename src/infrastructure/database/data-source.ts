// Load .env before any other imports that read process.env
require('dotenv').config({ path: require('path').join(process.cwd(), '.env') });
require(require('path').join(process.cwd(), 'scripts/resolve-env-urls.cjs')).applyEnvironmentUrls();

import { DataSource } from 'typeorm';
import { configuration } from '../../config/configuration';

const config = configuration();
const db = config.database;

export default new DataSource({
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

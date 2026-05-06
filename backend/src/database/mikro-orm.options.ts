import { UnderscoreNamingStrategy } from '@mikro-orm/core';
import { Migrator } from '@mikro-orm/migrations';
import { MySqlDriver, defineConfig } from '@mikro-orm/mysql';
import { LeaveRequest } from './entities/leave-request.entity';
import { Role } from './entities/role.entity';
import { Staff } from './entities/staff.entity';

export type DatabaseEnv = {
  DB_HOST?: string;
  DB_PORT?: string;
  DB_USER?: string;
  DB_PASSWORD?: string;
  DB_NAME?: string;
};

export function createMikroOrmConfig(env: DatabaseEnv) {
  const port = Number(env.DB_PORT ?? 3306);

  return defineConfig({
    driver: MySqlDriver,
    host: env.DB_HOST ?? 'localhost',
    port: Number.isFinite(port) ? port : 3306,
    user: env.DB_USER ?? 'leaveapp',
    password: env.DB_PASSWORD ?? 'leaveapp',
    dbName: env.DB_NAME ?? 'leaveapp',
    entities: [Role, Staff, LeaveRequest],
    namingStrategy: UnderscoreNamingStrategy,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    driverOptions: {
      connection: {
        charset: 'utf8mb4',
      },
    },
    migrations: {
      path: 'dist/migrations',
      pathTs: 'src/migrations',
      glob: '!(*.d).{js,ts}',
    },
    extensions: [Migrator],
  });
}

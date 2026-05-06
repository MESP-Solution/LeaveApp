import 'reflect-metadata';
import { createMikroOrmConfig } from './src/database/mikro-orm.options';

export default createMikroOrmConfig(process.env);

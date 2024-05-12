import { DataSource } from 'typeorm';
import { databaseConfig } from './orm.config.prod';

export default new DataSource(databaseConfig as any);

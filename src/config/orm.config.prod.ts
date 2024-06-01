import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import {
  Button,
  ConfigurationLayout,
  Editor,
  Facility,
  Position,
  PositionConfiguration,
} from '../configuration/entities';
import { InitialDatabase1717275871694 } from '../migrations';
dotenv.config();

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DATABASE_URL,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PWD,
  database: process.env.DATABASE_DB,
  entities: [
    Button,
    ConfigurationLayout,
    Editor,
    Facility,
    PositionConfiguration,
    Position,
  ],
  migrations: [InitialDatabase1717275871694],
  // logging: true,
  maxQueryExecutionTime: process.env.NODE_ENV === 'production' ? 9999999 : 5000,
  retryAttempts: 1,
};

export default registerAs(
  'orm.config',
  (): TypeOrmModuleOptions => databaseConfig,
);

import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Button } from 'src/configuration/entities/button.entity';
import { ConfigurationLayout } from 'src/configuration/entities/configuration-layout.entity';
import { Editor } from 'src/configuration/entities/editor.entity';
import { Facility } from 'src/configuration/entities/facility.entity';
import { PositionConfiguration } from 'src/configuration/entities/position-configuration.entity';
import { Position } from 'src/configuration/entities/position.entity';

export default registerAs(
  'orm.config',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DATABASE_URL,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PWD,
    database: process.env.DATABASE_DB,
    entities: [
      Facility,
      Editor,
      Position,
      PositionConfiguration,
      ConfigurationLayout,
      Button,
    ],
    // synchronize: process.env.NODE_ENV === 'development',
    synchronize: process.env.NODE_ENV !== 'production',
    // logging: true
    maxQueryExecutionTime:
      process.env.NODE_ENV === 'production' ? 9999999 : 5000,
  }),
);

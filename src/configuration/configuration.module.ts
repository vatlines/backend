import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { ConfigurationController } from './configuration.controller';
import { ConfigurationService } from './configuration.service';
import { Button } from './entities/button.entity';
import { Editor } from './entities/editor.entity';
import { Facility } from './entities/facility.entity';
import { PositionConfiguration } from './entities/position-configuration.entity';
import { Position } from './entities/position.entity';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  controllers: [ConfigurationController],
  providers: [ConfigurationService],
  imports: [
    AuthModule,
    ConfigModule,
    JwtModule,
    TypeOrmModule.forFeature([
      Facility,
      Editor,
      Position,
      PositionConfiguration,
      Button,
    ]),
    HttpModule,
    CacheModule.register(),
  ],
  exports: [TypeOrmModule, ConfigurationService],
})
export class ConfigurationModule {}

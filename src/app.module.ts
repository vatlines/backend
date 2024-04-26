import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import ormConfigProd from './config/orm.config.prod';
import { ConfigurationModule } from './configuration/configuration.module';
import { LoggerModule } from './logger/logger.module';
import { SocketModule } from './socket/socket.module';
import { VatsimDataModule } from './vatsim-data/vatsim-data.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    SocketModule,
    AuthModule,
    ConfigurationModule,
    TypeOrmModule.forRootAsync({
      useFactory: ormConfigProd,
    }),
    VatsimDataModule,
    LoggerModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

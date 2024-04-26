import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { json } from 'express';
import * as session from 'express-session';
import { AppModule } from './app.module';
import { ConfigurationService } from './configuration/configuration.service';
import { Log4jsLogger } from './logger/logger.service';
import { SocketIOAdapter } from './socket-io-adapter';
import { VatsimDataService } from './vatsim-data/vatsim-data.service';

async function bootstrap() {
  const logger = new Logger('Main (main.ts)');
  const app = await NestFactory.create(AppModule, {
    cors: true,
    bufferLogs: true,
  });

  app.useLogger(app.get(Log4jsLogger));

  const configService = app.get(ConfigService);
  const vatsimDataService = app.get(VatsimDataService);
  const configurationService = app.get(ConfigurationService);
  const port = parseInt(configService.get<string>('PORT') ?? '3001');

  app.useWebSocketAdapter(
    new SocketIOAdapter(
      app,
      configService,
      vatsimDataService,
      configurationService,
    ),
  );
  app.use(
    session({
      resave: false,
      saveUninitialized: false,
      secret: configService.get<string>('SESSION_KEY') ?? crypto.randomUUID(),
    }),
  );

  app.use(json({ limit: '50mb' }));

  app.use(cookieParser());

  app.setGlobalPrefix('/api');

  await app.listen(port);

  logger.log(`Server running on port ${port}`);
}
bootstrap();

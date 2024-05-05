import { INestApplicationContext, Logger } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, ServerOptions, Socket } from 'socket.io';
import { ConfigurationService } from './configuration/configuration.service';
import { VatsimDataService } from './vatsim-data/vatsim-data.service';
import { Position } from './configuration/entities/position.entity';
import { instrument } from '@socket.io/admin-ui';

export class SocketIOAdapter extends IoAdapter {
  private readonly logger = new Logger(SocketIOAdapter.name);
  constructor(
    private app: INestApplicationContext,
    private configService: ConfigService,
    private vatsimService: VatsimDataService,
    private positionService: ConfigurationService,
  ) {
    super(app);
  }

  createIOServer(port: number, options: ServerOptions) {
    const cors: CorsOptions = {
      origin: [
        new RegExp(`/http:\/\/localhost:[0-9]+/`),
        new RegExp(`/^http:\/\/192\.168\.[0-9]+\.[0-9]+:[0-9]+$/`),
        'https://admin.socket.io',
        'http://192.168.30.2',
        'http://192.168.30.2:3000',
        'http://192.168.30.2:3001',
        'http://localhost:3001',
        'http://localhost:3000',
      ],
      credentials: true,
    };

    const optionsWithCors: ServerOptions = {
      ...options,
      cors,
    };

    const jwtService = this.app.get(JwtService);
    const server: Server = super.createIOServer(port, optionsWithCors);

    server.use(this.createTokenMiddleware(jwtService, this.logger));
    server.use(this.onlineMiddleware(this.vatsimService, this.logger));
    server.use(this.positionMiddleware(this.positionService, this.logger));

    instrument(server, {
      auth:
        process.env.NODE_ENV === 'development'
          ? false
          : {
              type: 'basic',
              username: 'admin',
              password: '123',
            },
      mode:
        process.env.NODE_ENV === 'production' ? 'production' : 'development',
    });

    return server;
  }

  createTokenMiddleware =
    (jwtService: JwtService, logger: Logger) =>
    (socket: SocketWithAuth, next: any) => {
      const token =
        socket.handshake.auth.token || socket.handshake.headers['token'];

      try {
        const payload = jwtService.verify(token, {
          secret: this.configService.get<string>('AUTH_SIGNING_KEY') ?? '',
        });
        if (
          !payload.user.vatsim.rating ||
          Number.isNaN(payload.user.vatsim.rating.id) ||
          payload.user.vatsim.rating.id < 2
        ) {
          next(new Error('Rating not approved for use of this application.'));
        } else {
          socket.cid = payload.user.cid;
          next();
        }
      } catch (err) {
        logger.error(`error with socket token middleware: ${err}`);
        next(new Error('Forbidden.'));
      }
    };

  onlineMiddleware =
    (vatsimService: VatsimDataService, logger: Logger) =>
    (socket: SocketWithAuth, next: any) => {
      if (process.env.NODE_ENV === 'development') {
        socket.callsign = 'CHI_Z_APP';
        socket.frequency = '119.000';
        next();
        return;
      }

      try {
        const match = vatsimService.isControllerActive(socket.cid);
        if (match) {
          socket.callsign = match.callsign;
          socket.frequency = match.frequency;
          next();
        } else {
          next(new Error(`No active controlling session found.`));
        }
      } catch (err) {
        logger.error(`Error validating online status: ${err}`);
        next(new Error('Unable to verify controller session.'));
      }
    };

  positionMiddleware =
    (positionService: ConfigurationService, logger: Logger) =>
    async (socket: SocketWithAuth, next: any) => {
      try {
        const match = await positionService.findPositionByCallsignPrefix(
          socket.callsign,
          socket.frequency,
        );

        if (match) {
          socket.position = match;
          socket.sector = `${match.facility.id}-${match.sector}`;
          socket.emit('config', match);
          next();
        } else {
          next(new Error(`No configuration found for active position.`));
        }
      } catch (err) {
        logger.error(`Error validating position: ${err}`);
        next(new Error(`Unable to verify position configuration.`));
      }
    };
}

type AuthPayload = {
  cid: number;
};

type OnlinePayload = {
  callsign: string;
};

type ConfigPayload = {
  position: Position;
  sector: string;
  frequency: string;
};

export type SocketWithAuth = Socket &
  AuthPayload &
  OnlinePayload &
  ConfigPayload;

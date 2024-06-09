import { INestApplicationContext, Logger } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { instrument } from '@socket.io/admin-ui';
import { createHmac } from 'crypto';
import { Server, ServerOptions, Socket } from 'socket.io';
import { ConfigurationService } from './configuration/configuration.service';
import { Position } from './configuration/entities/position.entity';
import { VatsimDataService } from './vatsim-data/vatsim-data.service';

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
          socket.cid = parseInt(`${payload.user.cid}`);
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
        if (socket.cid === 10000002) {
          // socket.callsign = 'CHI_B_DEP';
          // socket.frequency = '125.000';
          socket.callsign = 'CHI_64_CTR';
          socket.frequency = '133.300';
        } else {
          socket.callsign = 'CHI_Z_APP';
          socket.frequency = '119.000';
          // socket.callsign = 'CHI_81_CTR';
          // socket.frequency = '120.350';
        }
        socket.lastUpdated = new Date('2099-01-01T23:48:55.6043769Z');
        next();
        return;
      }

      try {
        const match = vatsimService.isControllerActive(socket.cid);
        if (match) {
          socket.callsign = match.callsign;
          socket.frequency = match.frequency;
          socket.lastUpdated = new Date(match.last_updated);
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
        if (process.env.NODE_ENV !== 'production') {
          if (socket.cid == 1369362) {
            if (Math.random() <= 0.5) {
              socket.callsign = 'ORD_I_GND';
              socket.frequency = '121.900';
            }
          }
        }
        const match = await positionService.findPositionByCallsignPrefix(
          socket.callsign,
          socket.frequency,
        );

        if (match) {
          socket.position = match;
          socket.facility = match.facility.facilityId;
          socket.sector = `${match.facility.facilityId}-${match.sector}`;
          socket.emit('config', {
            ...match,
            turn: this.generateTurnCredentials(socket.cid),
          });
          next();
        } else {
          next(new Error(`No configuration found for active position.`));
        }
      } catch (err) {
        logger.error(`Error validating position: ${err}`);
        next(new Error(`Unable to verify position configuration.`));
      }
    };

  generateTurnCredentials = (cid: number) => {
    const unixTimeStamp = parseInt(`${Date.now() / 1000}`) + 24 * 3600;
    const username = `${unixTimeStamp}:${cid}`;
    const hmac = createHmac('sha1', 'vatlines');
    hmac.setEncoding('base64');
    hmac.write(username);
    hmac.end();

    return {
      username,
      credential: hmac.read(),
    };
  };
}

type AuthPayload = {
  cid: number;
};

type OnlinePayload = {
  callsign: string;
  lastUpdated: Date;
};

type ConfigPayload = {
  position: Position;
  sector: string;
  facility: string;
  frequency: string;
};

export type SocketWithAuth = Socket &
  AuthPayload &
  OnlinePayload &
  ConfigPayload;

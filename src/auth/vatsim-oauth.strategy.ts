import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-oauth2';
import { AuthService } from './auth.service';

@Injectable()
export class VatsimStrategy extends PassportStrategy(Strategy, 'vatsim') {
  private readonly logger = new Logger(VatsimStrategy.name);
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {
    super({
      authorizationURL: `${configService.get('AUTH_URL')}/oauth/authorize`,
      tokenURL: `${configService.get('AUTH_URL')}/oauth/token`,
      clientID: configService.get<string>('AUTH_CLIENT_ID') ?? '',
      clientSecret: configService.get<string>('AUTH_CLIENT_SECRET') ?? '',
      callbackURL: configService.get<string>('AUTH_REDIRECT_URI') ?? '',
      scope: 'vatsim_details',
      passReqToCallback: true,
      state: true,
      store: true,
    });
  }

  async validate(_request: Request, accessToken: string) {
    const req = await fetch(`${this.configService.get('AUTH_URL')}/api/user`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await req.json();

    this.logger.log(`${data.data.cid} completed VATSIM Connect sign-in.`);
    return data.data;
  }
}

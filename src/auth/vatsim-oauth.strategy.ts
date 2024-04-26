import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-oauth2';
import { AuthService } from './auth.service';

@Injectable()
export class VatsimStrategy extends PassportStrategy(Strategy, 'vatsim') {
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

  async validate(
    _request: Request,
    accessToken: string,
    _refreshToken: string,
  ) {
    const req = await fetch(`${this.configService.get('AUTH_URL')}/api/user`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await req.json();

    return data.data;
  }
}

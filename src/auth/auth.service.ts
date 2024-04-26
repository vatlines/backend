import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  async signJwt(user: any) {
    return await this.jwtService.signAsync(JSON.stringify(user), {
      secret: this.configService.get<string>('AUTH_SIGNING_KEY') ?? '',
    });
  }

  async verifyJwt(token: string) {
    return await this.jwtService.verifyAsync(token, {
      secret: this.configService.get<string>('AUTH_SIGNING_KEY'),
    });
  }
}

export type AccessToken = {
  scopes: string[];
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
};

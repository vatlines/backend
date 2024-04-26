import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Req,
  Res,
  Session,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { VatsimAuthGuard } from './vatsim-auth.guard';

@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {}
  @Get('login')
  @UseGuards(VatsimAuthGuard)
  doLogin() {}

  @Get('callback/vatsim')
  @UseGuards(VatsimAuthGuard)
  async test(
    @Req() request: Request,
    @Res() response: Response,
    @Session() session: Record<string, any>,
  ) {
    const token = await this.authService.signJwt(session.passport);
    response.cookie('sid', token, {
      sameSite: false,
      maxAge: 86400000,
    });
    // response.redirect('/auth/test');
    response.redirect(`http://localhost:3000/?token=${token}`);
    // response.redirect(
    //   `${this.configService.get<string>('FRONTEND_URL')}/vatlines`,
    // );
  }

  @Post('user')
  async getUser(@Body() body: { token: string }) {
    const a = await this.authService.verifyJwt(body.token);
    return {
      ...a,
      token: body.token,
    };
  }
}

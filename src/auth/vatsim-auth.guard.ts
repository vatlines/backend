import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class VatsimAuthGuard extends AuthGuard('vatsim') {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    const activate = (await super.canActivate(context)) as boolean;
    await super.logIn(request);
    return activate;
  }
}

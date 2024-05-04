import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { AuthGuard, IAuthModuleOptions } from '@nestjs/passport';

@Injectable()
export class VatsimAuthGuard extends AuthGuard('vatsim') {
  private readonly logger = new Logger(VatsimAuthGuard.name);
  getAuthenticateOptions(
    context: ExecutionContext,
  ): IAuthModuleOptions<any> | undefined {
    const request = context.switchToHttp().getRequest();

    return {
      state: {
        callbackUrl: request.params.callbackUrl ?? '/',
      },
    };
  }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    try {
      const activate = (await super.canActivate(context)) as boolean;
      await super.logIn(request);

      return activate;
    } catch (err) {
      this.logger.error(`Error doing Vatsim Auth Guard: ${err}`);
    }
    return false;
  }
}

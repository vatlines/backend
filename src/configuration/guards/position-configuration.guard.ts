import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigurationService } from '../configuration.service';
import { RequestIdInterceptor } from '../id.interceptor';

@Injectable()
export class PositionConfigurationGuard implements CanActivate {
  private readonly logger = new Logger(PositionConfigurationGuard.name);
  constructor(private configurationService: ConfigurationService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (!request.user) return false;

    const sqids = new RequestIdInterceptor();
    const bodyPosition = sqids.desanitizeProperties(request.body.position);

    if (bodyPosition) {
      return await this.configurationService.isEditorOfPosition(
        request.user.cid,
        bodyPosition,
      );
    } else {
      return false;
    }
  }
}

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigurationService } from '../configuration.service';

@Injectable()
export class PositionConfigurationGuard implements CanActivate {
  private readonly logger = new Logger(PositionConfigurationGuard.name);
  constructor(private configurationService: ConfigurationService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (!request.user) return false;
    const bodyPosition = request.body.position;

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

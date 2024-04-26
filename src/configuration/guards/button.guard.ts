import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigurationService } from '../configuration.service';

@Injectable()
export class ButtonGuard implements CanActivate {
  private readonly logger = new Logger(ButtonGuard.name);
  constructor(private configurationService: ConfigurationService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (!request.user) return false;
    const configuration = request.body.configuration;

    if (configuration) {
      return await this.configurationService.isEditorOfConfiguration(
        request.user.cid,
        configuration,
      );
    } else {
      return false;
    }
  }
}

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigurationService } from '../configuration.service';

@Injectable()
export class FacilityGuard implements CanActivate {
  private readonly logger = new Logger(FacilityGuard.name);
  constructor(private configurationService: ConfigurationService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (!request.user) return false;
    const parentFacility = request.body.parentFacility;
    const paramFacility = request.params.id as string;

    if (parentFacility) {
      return await this.configurationService.isEditorOfFacility(
        request.user.cid,
        parentFacility,
      );
    } else if (paramFacility) {
      return await this.configurationService.isEditorOfFacility(
        request.user.cid,
        paramFacility,
      );
    } else {
      return false;
    }
  }
}

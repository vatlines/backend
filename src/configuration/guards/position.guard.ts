import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigurationService } from '../configuration.service';
import { RequestIdInterceptor } from '../id.interceptor';

@Injectable()
export class PositionGuard implements CanActivate {
  private readonly logger = new Logger(PositionGuard.name);
  constructor(private configurationService: ConfigurationService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (!request.user) return false;
    const bodyFacility = request.body.facilityId;
    const sqids = new RequestIdInterceptor();
    const paramPosition = sqids.desanitizeProperties(
      request.params.id,
    ) as number;

    if (bodyFacility) {
      return await this.configurationService.isEditorOfFacility(
        request.user.cid,
        bodyFacility,
      );
    } else if (paramPosition) {
      return await this.configurationService.isEditorOfPosition(
        request.user.cid,
        paramPosition,
      );
    } else {
      return false;
    }
  }
}

@Injectable()
export class CreatePositionGuard implements CanActivate {
  private readonly logger = new Logger(CreatePositionGuard.name);
  constructor(private configurationService: ConfigurationService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (!request.user) return false;
    const parentFacility = request.body.facilityId;

    if (parentFacility) {
      return await this.configurationService.isEditorOfFacility(
        request.user.cid,
        parentFacility,
      );
    } else {
      return false;
    }
  }
}

import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isNumber } from 'class-validator';
import { map, Observable } from 'rxjs';
import Sqids from 'sqids';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  private sqids: Sqids;
  private readonly configService = new ConfigService();
  constructor() {
    this.sqids = new Sqids({
      minLength: 6,
      alphabet: this.configService.get<string>('ALPHABET'),
    });
  }
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    if (request.body) {
      request.body = this.desanitizeProperties(request.body);
    }
    if (
      !request.path.includes('/configuration/facility/') &&
      request.params.id
    ) {
      if (isNumber(request.params.id) || request.params.id.length !== 6)
        throw new BadRequestException();
      request.params.id = this.desanitizeProperties(request.params.id);
    }

    return next.handle().pipe(map((data) => this.sanitizeProperties(data)));
  }

  public sanitizeProperties(data: any): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeProperties(item));
    }
    if (typeof data === 'object' && data !== null) {
      const sanitizedData: any = {};
      for (const key in data) {
        if (key === 'id' && typeof data[key] === 'number') {
          const replaced = this.sqids.encode([data[key]]);
          sanitizedData[key] = replaced;
        } else {
          sanitizedData[key] = this.sanitizeProperties(data[key]);
        }
      }
      return sanitizedData;
    }
    return data;
  }

  public desanitizeProperties(data: any): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.desanitizeProperties(item));
    }

    if (typeof data === 'object' && data !== null) {
      const desanitizeData: any = {};
      for (const key in data) {
        if (key === 'id') {
          if (isNumber(data[key]) || data[key].length !== 6) {
            throw new BadRequestException(`${key} bad value: ${data[key]}`);
          }
          const replaced = this.sqids.decode(data[key]);
          if (replaced.length === 0)
            throw new BadRequestException(`Invalid property: ${key}`);
          desanitizeData[key] = replaced[0];
        } else {
          desanitizeData[key] = this.desanitizeProperties(data[key]);
        }
      }
      return desanitizeData;
    } else if (typeof data === 'string' && data.length === 6) {
      const decoded = this.sqids.decode(data);
      if (decoded.length !== 0) {
        return this.sqids.decode(data)[0];
      }
    }
    return data;
  }
}

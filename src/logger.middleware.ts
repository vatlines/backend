import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { performance } from 'perf_hooks';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger();

  use(request: Request, response: Response, next: NextFunction): void {
    const start = performance.now();

    response.on('finish', () => {
      if (request.path !== '/') {
        this.logger.debug(
          `Took ${(performance.now() - start).toFixed(3)}ms to complete request`,
          `${request.method} ${request.path} (${response.statusCode})`,
        );
      }
    });

    next();
  }
}

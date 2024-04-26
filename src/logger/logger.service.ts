import { Injectable, LoggerService } from '@nestjs/common';
import { Logger } from 'log4js';

@Injectable()
export class Log4jsLogger implements LoggerService {
  constructor(private readonly logger: Logger) {}

  log(message: any, ...optionalParams: any[]) {
    this.logger.info(message, optionalParams);
  }
  fatal(message: any, ...optionalParams: any[]) {
    this.logger.fatal(message, optionalParams);
  }
  error(message: any, ...optionalParams: any[]) {
    this.logger.error(message, optionalParams);
  }
  warn(message: any, ...optionalParams: any[]) {
    this.logger.warn(message, optionalParams);
  }
  debug?(message: any, ...optionalParams: any[]) {
    this.logger.debug(message, optionalParams);
  }
}

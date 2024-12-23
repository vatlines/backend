import { DynamicModule, Global, Module } from '@nestjs/common';
import {
  DEFAULT_LOG4JS_OPTIONS,
  getLog4jsLoggerToken,
  getLog4jsOptionsToken,
  Log4jsAsyncOptions,
  Log4jsOptions,
} from './log4js.options';
import {
  createAsyncLog4jsOptions,
  createLog4jsLogger,
} from './log4js.providers';
import { Log4jsLogger } from './logger.service';

@Global()
@Module({})
export class LoggerModule {
  static forRoot(
    options: Log4jsOptions = DEFAULT_LOG4JS_OPTIONS,
  ): DynamicModule {
    return {
      module: LoggerModule,
      providers: [
        {
          provide: getLog4jsOptionsToken(options.name),
          useValue: options,
        },
        createLog4jsLogger(options.name),
        {
          provide: Log4jsLogger,
          useExisting: getLog4jsLoggerToken(options.name),
        },
      ],
      exports: [
        getLog4jsLoggerToken(options.name),
        {
          provide: Log4jsLogger,
          useExisting: getLog4jsLoggerToken(options.name),
        },
      ],
    };
  }

  static forRootAsync(options: Log4jsAsyncOptions): DynamicModule {
    return {
      module: LoggerModule,
      imports: options.imports,
      providers: [
        createAsyncLog4jsOptions(options),
        createLog4jsLogger(options.name),
        {
          provide: Log4jsLogger,
          useExisting: getLog4jsLoggerToken(options.name),
        },
      ],
      exports: [
        getLog4jsLoggerToken(options.name),
        {
          provide: Log4jsLogger,
          useExisting: getLog4jsLoggerToken(options.name),
        },
      ],
    };
  }
}

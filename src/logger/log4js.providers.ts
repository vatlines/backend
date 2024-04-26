import { FactoryProvider, Type } from '@nestjs/common';
import * as log4js from 'log4js';
import { LOG4JS_DEFAULT_CONFIG } from './log4js.constants';
import {
  getLog4jsLoggerToken,
  getLog4jsOptionsToken,
  Log4jsAsyncOptions,
  Log4jsOptions,
  Log4jsOptionsFactory,
} from './log4js.options';
import { Log4jsLogger } from './logger.service';

export type Log4jsLoggerFactoryProvider = FactoryProvider<
  Log4jsLogger | Promise<Log4jsLogger>
>;
export type Log4jsOptionsFactoryProvider = FactoryProvider<
  Log4jsOptions | Promise<Log4jsOptions>
>;

export const createLog4jsLogger = (
  name: string | undefined,
): Log4jsLoggerFactoryProvider => ({
  provide: getLog4jsLoggerToken(name),
  inject: [getLog4jsOptionsToken(name)],
  useFactory: async (options: Log4jsOptions): Promise<Log4jsLogger> => {
    const config = options.config ?? LOG4JS_DEFAULT_CONFIG;
    const logger = log4js.configure(config).getLogger();

    // logger.setParseCallStackFunction(parseNestModuleCallStack);

    return new Log4jsLogger(logger);
  },
});

export const createAsyncLog4jsOptions = (
  options: Log4jsAsyncOptions,
): Log4jsOptionsFactoryProvider => {
  if (options.useFactory) {
    return {
      provide: getLog4jsOptionsToken(options.name),
      inject: options.inject,
      useFactory: options.useFactory,
    };
  }

  const inject = [
    (options.useClass || options.useExisting) as Type<Log4jsOptionsFactory>,
  ];

  return {
    provide: getLog4jsOptionsToken(options.name),
    inject: inject,
    useFactory: async (log4jsOptionsFactory: Log4jsOptionsFactory) => {
      return log4jsOptionsFactory.createLog4jsOptions();
    },
  };
};

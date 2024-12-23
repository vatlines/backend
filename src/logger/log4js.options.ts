import { FactoryProvider, ModuleMetadata, Type } from '@nestjs/common';
import { Configuration } from 'log4js';
import {
  LOG4JS_DEFAULT_CONFIG,
  LOG4JS_LOGGER,
  LOG4JS_OPTIONS,
} from './log4js.constants';

export interface Log4jsOptionsFactory {
  createLog4jsOptions(): Log4jsAsyncOptions | Promise<Log4jsOptions>;
}

export interface Log4jsOptions {
  name?: string;

  config?: Configuration;
}

export const DEFAULT_LOG4JS_OPTIONS: Log4jsOptions = {
  config: LOG4JS_DEFAULT_CONFIG,
};

export interface Log4jsAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  name?: string;
  inject?: FactoryProvider['inject'];
  useExisting?: Type<Log4jsOptionsFactory>;
  useClass?: Type<Log4jsOptionsFactory>;
  useFactory?: (...args: any[]) => Log4jsOptions | Promise<Log4jsOptions>;
}

export const isSymbol = (fn: any): fn is symbol => typeof fn === 'symbol';

export const getLog4jsOptionsToken = (
  name: string | symbol = LOG4JS_OPTIONS,
): string | symbol => {
  if (name === LOG4JS_OPTIONS) {
    return LOG4JS_OPTIONS;
  }

  if (!isSymbol(name)) {
    return `${name}_LOG4JS_OPTIONS`;
  }

  return `DEFAULT_TOKEN_LOG4JS_OPTIONS`;
};

export const getLog4jsLoggerToken = (
  name: string | symbol = LOG4JS_LOGGER,
): string | symbol => {
  if (name === LOG4JS_LOGGER) {
    return LOG4JS_LOGGER;
  }

  if (!isSymbol(name)) {
    return `${name}_LOG4JS_LOGGER`;
  }

  return `DEFAULT_TOKEN_LOG4JS_LOGGER`;
};

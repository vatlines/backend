import { Configuration } from 'log4js';

export const LOG4JS_OPTIONS = Symbol('NEST_LOG4JS_OPTIONS');
export const LOG4JS_LOGGER = Symbol('NEST_LOG4JS_Logger');

export const LOG4JS_DEFAULT_LAYOUT = {
  type: 'pattern',
  pattern:
    '%[[%d{yyyy-MM-dd hh:mm:ss.SSS} %-5.5p %x{pid} (%x{source})]%]: %x{data}',
  tokens: {
    source: (logEvent: any) => logEvent.data[1] || '',
    pid: (logEvent: any) => {
      return logEvent.pid || '';
    },
    data: (logEvent: any) => logEvent.data[0] || '',
  },
};

export const LOG4JS_NO_COLOR_DEFAULT_LAYOUT = {
  type: 'pattern',
  pattern:
    '[%d{yyyy-MM-dd hh:mm:ss.SSS} %-5.5p %x{pid} (%x{source})]: %x{data}',
  tokens: {
    source: (logEvent: any) => logEvent.data[1] || '',
    pid: (logEvent: any) => {
      return logEvent.pid || '';
    },
    data: (logEvent: any) => logEvent.data[0] || '',
  },
};

export const LOG4JS_DEFAULT_CONFIG: Configuration = {
  appenders: {
    console: {
      type: 'stdout',
      layout: LOG4JS_DEFAULT_LAYOUT,
    },
    everything: {
      type: 'file',
      filename: './logs/log.log',
      maxLogSize: '10M',
      keepFileExt: true,
      fileNameSep: '-',
      backups: 10,
      layout: LOG4JS_NO_COLOR_DEFAULT_LAYOUT,
    },
    info: {
      type: 'file',
      filename: './logs/info.log',
      maxLogSize: '10M',
      keepFileExt: true,
      fileNameSep: '-',
      layout: LOG4JS_NO_COLOR_DEFAULT_LAYOUT,
    },
    warn: {
      type: 'file',
      filename: './logs/warn.log',
      maxLogSize: '10M',
      keepFileExt: true,
      fileNameSep: '-',
      layout: LOG4JS_NO_COLOR_DEFAULT_LAYOUT,
    },
    error: {
      type: 'file',
      filename: './logs/error.log',
      maxLogSize: '10M',
      keepFileExt: true,
      fileNameSep: '-',
      layout: LOG4JS_NO_COLOR_DEFAULT_LAYOUT,
    },
    // Filters
    justInfo: {
      type: 'logLevelFilter',
      appender: 'info',
      level: 'info',
      maxLevel: 'info',
    },
    justWarning: {
      type: 'logLevelFilter',
      appender: 'warn',
      level: 'warn',
      maxLevel: 'warn',
    },
    justError: {
      type: 'logLevelFilter',
      appender: 'error',
      level: 'error',
    },
  },
  categories: {
    default: {
      appenders: [
        'console',
        'everything',
        'justInfo',
        'justWarning',
        'justError',
      ],
      level: 'debug',
    },
  },
};

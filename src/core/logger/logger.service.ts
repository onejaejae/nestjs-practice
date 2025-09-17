import { Inject, Injectable, Scope } from '@nestjs/common';
import { INQUIRER } from '@nestjs/core';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { v7 } from 'uuid';
import { Log } from './logger.interface';
import { MoinConfigService } from '../config/config.service';
import { Env } from '../config';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService {
  private context: string;
  private isTest: boolean;

  public constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly winstonLogger: WinstonLogger,
    @Inject(INQUIRER) private readonly caller: object,
    private readonly configService: MoinConfigService,
  ) {
    this.context = this.caller?.constructor.name || 'Unknown';
    this.isTest = this.configService.getAppConfig().ENV === Env.test;
  }

  private format(obj: object | string, message = ''): Log {
    const log: Log = { message, logId: v7() };
    const appConfig = this.configService.getAppConfig();

    // additional metadata for cloudwatch
    if (appConfig.ENV !== Env.local) {
      log.app = appConfig.NAME;
      log.env = appConfig.ENV;
    }

    if (obj instanceof Error) {
      log.stack = obj.stack;
      return log;
    }

    if (typeof obj === 'string') {
      log.message = `${obj} ${message}`;
      return log;
    }

    log.data = obj;
    return log;
  }

  public setContext(context: string) {
    this.context = context;
  }

  private makeContextString(detailedContext: string) {
    return `${this.context}.${detailedContext}`;
  }

  public verbose(
    detailedContext: string,
    object: object | string,
    message?: string,
  ) {
    const log = this.format(object, message);
    this.winstonLogger.verbose?.(log, this.makeContextString(detailedContext));
  }

  public debug(
    detailedContext: string,
    object: object | string,
    message?: string,
  ) {
    const log = this.format(object, message);
    this.winstonLogger.debug?.(log, this.makeContextString(detailedContext));
  }

  public info(
    detailedContext: string,
    object: object | string,
    message?: string,
  ) {
    if (this.isTest) return;

    const log = this.format(object, message);
    this.winstonLogger.log(log, this.makeContextString(detailedContext));
  }

  public warn(
    detailedContext: string,
    object: object | string,
    message?: string,
  ) {
    if (this.isTest) return;

    const log = this.format(object, message);
    this.winstonLogger.warn(log, this.makeContextString(detailedContext));
  }

  public error(
    detailedContext: string,
    object: object | string,
    message?: string,
  ) {
    if (this.isTest) return;

    const log = this.format(object, message);
    this.winstonLogger.error(
      log,
      undefined,
      this.makeContextString(detailedContext),
    );
  }
}

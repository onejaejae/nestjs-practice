import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../logger/logger.service';
import { RequestContextService } from '../cls/cls.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly requestContextService: RequestContextService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const requestId = this.requestContextService.getRequestId();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);

    const { method, originalUrl, body, query, ip } = req;
    const userAgent = req.headers['user-agent'];

    this.loggerService.info(
      this.constructor.name,
      {
        requestId,
        url: originalUrl,
        method,
        body,
        query,
        ip,
        userAgent,
      },
      `Start Request: ${method} ${originalUrl}`,
    );

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      this.loggerService.info(
        this.constructor.name,
        {
          requestId,
          method,
          url: originalUrl,
          statusCode: res.statusCode,
          duration,
        },
        `Finish Request: ${method} ${originalUrl} with status ${res.statusCode}`,
      );
    });

    next();
  }
}

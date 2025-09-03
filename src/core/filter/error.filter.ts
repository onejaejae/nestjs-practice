import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from 'src/core/logger/logger.service';
import { MoinConfigService } from 'src/core/config/config.service';
import { Env } from 'src/core/config';

interface ErrorResponse {
  statusCode: number;
  message: string;
  path: string;
  error: string;
  stack?: string;
}

@Catch()
export class ErrorFilter implements ExceptionFilter {
  constructor(
    private readonly loggerService: LoggerService,
    private readonly configService: MoinConfigService,
  ) {}

  private getRequestBody(request: Request): string {
    try {
      const isAuthRequest =
        request.url.includes('/auth/signup') ||
        request.url.includes('/auth/signin');

      return isAuthRequest
        ? JSON.stringify({ ...request.body, password: '******' })
        : JSON.stringify(request.body);
    } catch {
      this.loggerService.warn(
        this.constructor.name,
        request.body,
        'failed stringify request body',
      );
      return JSON.stringify({});
    }
  }

  catch(exception: any, host: ArgumentsHost) {
    const env = this.configService.getAppConfig().ENV;
    const isProduction = env === Env.prod;

    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const requestId = request.headers['x-request-id'] as string;

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = exception.message || 'Internal Server Error';
    let payload: any = {};

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const httpPayload = exception.getResponse();
      if (typeof httpPayload === 'string') {
        message = httpPayload;
      } else {
        payload = httpPayload;
        message = (httpPayload as any).message || message;
      }
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      message,
      path: request.url,
      error: exception.name || 'Error',
      ...(isProduction ? {} : { stack: exception.stack }),
    };

    const requestBody = this.getRequestBody(request);
    const req = {
      method: request.method,
      url: request.url,
      query: request.query,
      body: requestBody,
    };

    const res = {
      status: statusCode,
      headers: response.getHeaders(),
    };

    if (statusCode >= 500) {
      this.loggerService.error(
        this.constructor.name,
        errorResponse,
        'An error occurred.',
      );
    }

    this.loggerService.warn(
      this.constructor.name,
      {
        request: req,
        response: res,
        body: errorResponse,
        exception: exception?.stack,
        requestId,
      },
      `RESPONSE(ERROR): [${request.method}]${request.url}`,
    );

    const returnObj = {
      success: false,
      ...errorResponse,
      ...payload,
    };

    return response.status(statusCode).json(returnObj);
  }
}

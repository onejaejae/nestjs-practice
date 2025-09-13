import {
  ClassProvider,
  Global,
  MiddlewareConsumer,
  Module,
} from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ApiResponseInterceptor } from './interceptor/apiResponse.interceptor';
import { ErrorFilter } from './filter/error.filter';
import { TypeOrmModule } from './database/typeorm/typeorm.module';
import { LoggerModule } from './logger/logger.module';
import { CacheModule } from './cache/cache.module';
import { JwtModule } from './jwt/jwt.module';
import { JwtBlacklistGuard } from './guard/jwtBlacklist.guard';
import { AccessTokenGuard } from './guard/accessToken.guard';
import { ClsMiddleware } from 'nestjs-cls';
import { RequestLoggerMiddleware } from './middleware/requestLogger.middleware';
import { ClsModule } from './cls/cls.module';

const modules = [ConfigModule, LoggerModule, CacheModule, JwtModule, ClsModule];
const providers: ClassProvider[] = [];
const interceptors: ClassProvider[] = [
  { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
];
const guards: ClassProvider[] = [
  {
    provide: APP_GUARD,
    useClass: JwtBlacklistGuard,
  },
  {
    provide: APP_GUARD,
    useClass: AccessTokenGuard,
  },
];
const filters: ClassProvider[] = [
  { provide: APP_FILTER, useClass: ErrorFilter },
];

@Global()
@Module({
  imports: [TypeOrmModule.forRoot(), ...modules],
  providers: [...providers, ...interceptors, ...filters, ...guards],
  exports: [...modules, ...providers],
})
export class CoreModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ClsMiddleware)
      .forRoutes('*')
      .apply(RequestLoggerMiddleware)
      .forRoutes('*');
  }
}

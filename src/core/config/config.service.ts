import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AppConfig,
  AWSConfig,
  Configurations,
  DBConfig,
  JwtConfig,
  MongoDBConfig,
  RedisConfig,
} from '.';

@Injectable()
export class MoinConfigService {
  constructor(private readonly configService: ConfigService<Configurations>) {}

  getAppConfig(): AppConfig {
    return this.configService.getOrThrow('APP');
  }

  getDBConfig(): DBConfig {
    return this.configService.getOrThrow('DB');
  }

  getMongoDBConfig(): MongoDBConfig {
    return this.configService.getOrThrow('MONGODB');
  }

  getRedisConfig(): RedisConfig {
    return this.configService.getOrThrow('REDIS');
  }

  getJwtConfig(): JwtConfig {
    return this.configService.getOrThrow('JWT');
  }

  getAwsConfig(): AWSConfig {
    return this.configService.getOrThrow('AWS');
  }
}

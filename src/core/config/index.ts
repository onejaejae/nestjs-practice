export enum Env {
  test = 'test',
  local = 'local',
  dev = 'dev',
  prod = 'prod',
}

export interface AppConfig {
  NAME: string;
  PORT: string | number;
  BASE_URL: string;
  NODE_ENV: string;
  ENV: Env;
}

export interface RedisConfig {
  HOST: string;
  PORT: number | string;
}

export interface DBConfig {
  DB_HOST: string;
  DB_USER_NAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  DB_PORT: number | string;
}

export interface MongoDBConfig {
  MONGODB_URI: string;
  MONGODB_DATABASE: string;
}

export interface JwtConfig {
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRATION: string;
  JWT_REFRESH_EXPIRATION: string;
}

export interface AWSConfig {
  s3: {
    BUCKET: string;
    REGION: string;
    ACCESS_KEY: string;
    SECRET_KEY: string;
  };
}

export interface Configurations {
  APP: AppConfig;
  DB: DBConfig;
  MONGODB: MongoDBConfig;
  REDIS: RedisConfig;
  JWT: JwtConfig;
  AWS: AWSConfig;
}

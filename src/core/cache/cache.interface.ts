import { Union } from 'src/common/type/common.interface';

export const CacheServiceKey = Symbol('CacheServiceKey');
export const RedisClientKey = Symbol('RedisClientKey');

export interface ICacheService {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string | number | boolean,
    ttl?: number,
  ): Promise<void>;
  del(key: string): Promise<void>;
  zadd(key: string, score: number, value: string): Promise<number>;
  zrevrank(key: string, value: string): Promise<number | null>;
  zrevrange(key: string, start: number, end: number): Promise<string[]>;
}

export const CacheKeys = {
  RefreshToken: 'refresh-token/',
  TokenBlacklist: 'token-blacklist/',
  User: 'user/',
  UserRank: 'user-rank/',
} as const;
export type CacheKeys = Union<typeof CacheKeys>;

export interface ICacheOptions {
  key: string;
  ttl: number;
  index?: number;
}

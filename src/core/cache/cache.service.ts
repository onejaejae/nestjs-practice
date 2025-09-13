import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ICacheService, RedisClientKey } from './cache.interface';
@Injectable()
export class CacheService implements ICacheService {
  constructor(@Inject(RedisClientKey) private readonly redis: Redis) {}

  private async setTTL(key: string, ttl: number = 0) {
    return this.redis.expire(key, ttl);
  }

  public async get(key: string): Promise<string | null> {
    const data = await this.redis.get(key);
    if (data) {
      return JSON.parse(data);
    }

    return null;
  }

  public async set(
    key: string,
    value: string | number | boolean,
    ttl?: number,
  ) {
    const serializedValue = JSON.stringify(value);

    await this.redis.set(key, serializedValue);
    await this.setTTL(key, ttl);
  }

  public async del(key: string) {
    await this.redis.del(key);
  }

  public async zadd(key: string, score: number, value: string) {
    return this.redis.zadd(key, score, value);
  }

  public async zrevrank(key: string, value: string): Promise<number | null> {
    const rank = await this.redis.zrevrank(key, value);

    return rank !== null ? rank + 1 : null;
  }

  public async zrevrange(key: string, start: number, end: number) {
    return this.redis.zrevrange(key, start, end);
  }
}

export class MockCacheService implements ICacheService {
  private data: Record<string, { value: string; expiresAt?: number }> = {};
  private sortedSets: Record<string, Array<{ score: number; value: string }>> =
    {};

  constructor() {}

  private isExpired(key: string): boolean {
    const item = this.data[key];
    if (!item || !item.expiresAt) return false;
    return Date.now() > item.expiresAt;
  }

  private cleanupExpired(): void {
    Object.keys(this.data).forEach((key) => {
      if (this.isExpired(key)) {
        delete this.data[key];
      }
    });
  }

  private async setTTL(key: string, ttl: number = 0): Promise<void> {
    if (this.data[key] && ttl > 0) {
      this.data[key].expiresAt = Date.now() + ttl * 1000;
    }
  }

  public async get(key: string): Promise<string | null> {
    this.cleanupExpired();

    const item = this.data[key];
    if (!item || this.isExpired(key)) {
      return null;
    }

    return JSON.parse(item.value);
  }

  public async set(
    key: string,
    value: string | number | boolean,
    ttl?: number,
  ): Promise<void> {
    const serializedValue = JSON.stringify(value);
    const expiresAt = ttl ? Date.now() + ttl * 1000 : undefined;

    this.data[key] = {
      value: serializedValue,
      expiresAt,
    };
  }

  public async del(key: string): Promise<void> {
    delete this.data[key];
    delete this.sortedSets[key];
  }

  public async zadd(
    key: string,
    score: number,
    value: string,
  ): Promise<number> {
    if (!this.sortedSets[key]) {
      this.sortedSets[key] = [];
    }

    // 기존 값이 있으면 제거
    this.sortedSets[key] = this.sortedSets[key].filter(
      (item) => item.value !== value,
    );

    // 새 값 추가
    this.sortedSets[key].push({ score, value });

    // score 기준으로 정렬 (내림차순)
    this.sortedSets[key].sort((a, b) => b.score - a.score);

    return 1;
  }

  public async zrevrank(key: string, value: string): Promise<number | null> {
    const sortedSet = this.sortedSets[key];
    if (!sortedSet) return null;

    const index = sortedSet.findIndex((item) => item.value === value);
    return index !== -1 ? index + 1 : null;
  }

  public async zrevrange(
    key: string,
    start: number,
    end: number,
  ): Promise<string[]> {
    const sortedSet = this.sortedSets[key];
    if (!sortedSet) return [];

    // Redis의 zrevrange는 0-based index, end는 inclusive
    const actualEnd = end === -1 ? sortedSet.length - 1 : end;
    return sortedSet.slice(start, actualEnd + 1).map((item) => item.value);
  }
}

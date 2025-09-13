import { Inject, Injectable } from '@nestjs/common';
import {
  CacheKeys,
  CacheServiceKey,
  ICacheService,
} from 'src/core/cache/cache.interface';

@Injectable()
export class RankService {
  constructor(
    @Inject(CacheServiceKey) private readonly cacheService: ICacheService,
  ) {}

  async getUserRank(userId: string): Promise<number | null> {
    const rank = await this.cacheService.zrevrank(CacheKeys.UserRank, userId);

    return rank;
  }

  async updateUserRank(userId: string, score: number): Promise<number> {
    return this.cacheService.zadd(CacheKeys.UserRank, score, userId);
  }

  async getUsersByRankRange(start: number, end: number) {
    return this.cacheService.zrevrange(CacheKeys.UserRank, start, end);
  }
}

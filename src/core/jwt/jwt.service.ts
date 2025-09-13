import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { MoinConfigService } from 'src/core/config/config.service';
import {
  CacheKeys,
  CacheServiceKey,
  ICacheService,
} from 'src/core/cache/cache.interface';
import { LoggerService } from 'src/core/logger/logger.service';
import {
  DecodedToken,
  JwtPayload,
  TokenPair,
  TokenType,
} from './jwt.interface';
import { User } from 'src/entities/user/user.entity';

@Injectable()
export class JwtService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiration: string;
  private readonly refreshExpiration: string;

  constructor(
    @Inject(CacheServiceKey) private readonly cacheService: ICacheService,
    private readonly nestJwtService: NestJwtService,
    private readonly configService: MoinConfigService,
    private readonly loggerService: LoggerService,
  ) {
    const jwtConfig = this.configService.getJwtConfig();
    this.accessSecret = jwtConfig.JWT_ACCESS_SECRET;
    this.refreshSecret = jwtConfig.JWT_REFRESH_SECRET;
    this.accessExpiration = jwtConfig.JWT_ACCESS_EXPIRATION;
    this.refreshExpiration = jwtConfig.JWT_REFRESH_EXPIRATION;
  }

  async generateTokenPair(userId: User['id']): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(userId),
      this.generateRefreshToken(userId),
    ]);

    // Store refresh token in Redis with user id as key
    await this.storeRefreshToken(userId, refreshToken);

    return { accessToken, refreshToken };
  }

  async generateAccessToken(userId: User['id']): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      type: TokenType.ACCESS,
    };

    return this.nestJwtService.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessExpiration,
    });
  }

  async generateRefreshToken(userId: User['id']): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      type: TokenType.REFRESH,
    };

    return this.nestJwtService.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshExpiration,
    });
  }

  async verifyAccessToken(token: string): Promise<DecodedToken> {
    try {
      const payload = await this.nestJwtService.verifyAsync<JwtPayload>(token, {
        secret: this.accessSecret,
      });

      if (payload.type !== TokenType.ACCESS) {
        throw new UnauthorizedException('Invalid token type');
      }

      return { payload, expired: false };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        const payload = this.nestJwtService.decode(token) as JwtPayload;
        return { payload, expired: true };
      }
      throw error;
    }
  }

  async verifyRefreshToken(token: string): Promise<DecodedToken> {
    try {
      const payload = await this.nestJwtService.verifyAsync<JwtPayload>(token, {
        secret: this.refreshSecret,
      });

      if (payload.type !== TokenType.REFRESH) {
        throw new UnauthorizedException('Invalid token type');
      }

      // Check if refresh token exists in Redis
      const storedToken = await this.getStoredRefreshToken(payload.sub);
      if (storedToken !== token) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return { payload, expired: false };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        const payload = this.nestJwtService.decode(token) as JwtPayload;
        return { payload, expired: true };
      }
      throw error;
    }
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const { payload, expired } = await this.verifyRefreshToken(refreshToken);

    if (expired) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Generate new token pair
    const newTokenPair = await this.generateTokenPair(payload.sub);
    return newTokenPair;
  }

  async revokeRefreshToken(userId: User['id']): Promise<void> {
    const key = this.getRefreshTokenKey(userId);
    await this.cacheService.del(key);
  }

  async revokeAllUserTokens(
    userId: User['id'],
    accessToken: string,
  ): Promise<void> {
    // Revoke refresh token
    await this.revokeRefreshToken(userId);

    // Add user to blacklist temporarily (until all access tokens expire)
    const blacklistKey = this.getBlacklistKey(accessToken);
    const ttl = this.parseExpirationToSeconds(this.accessExpiration);
    await this.cacheService.set(blacklistKey, true, ttl);
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklistKey = this.getBlacklistKey(token);
    const isBlacklisted = await this.cacheService.get(blacklistKey);
    return !!isBlacklisted;
  }

  private async storeRefreshToken(
    userId: User['id'],
    refreshToken: string,
  ): Promise<void> {
    const key = this.getRefreshTokenKey(userId);
    const ttl = this.parseExpirationToSeconds(this.refreshExpiration);
    await this.cacheService.set(key, refreshToken, ttl);
  }

  private async getStoredRefreshToken(
    userId: User['id'],
  ): Promise<string | null> {
    const key = this.getRefreshTokenKey(userId);
    return this.cacheService.get(key);
  }

  private getRefreshTokenKey(userId: User['id']): string {
    return `${CacheKeys.RefreshToken}${userId}`;
  }

  private getBlacklistKey(token: string): string {
    return `${CacheKeys.TokenBlacklist}${token}`;
  }

  private parseExpirationToSeconds(expiration: string): number {
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 3600; // Default 1 hour
    }
  }
}

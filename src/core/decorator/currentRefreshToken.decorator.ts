import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RefreshTokenData } from 'src/core/jwt/jwt.interface';

export const CurrentRefreshToken = createParamDecorator(
  (data: keyof RefreshTokenData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const refreshTokenData: RefreshTokenData = request.user;

    return data ? refreshTokenData[data] : refreshTokenData.refreshToken;
  },
);
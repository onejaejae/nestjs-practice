import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { AuthService } from './auth.service';
import { User } from 'src/entities/user/user.entity';
import { SignUpBody } from './dto/request/signUp.body';
import { SignInBody } from './dto/request/signIn.body';
import { CurrentUser } from 'src/core/decorator/currentUser.decorator';
import { CurrentRefreshToken } from 'src/core/decorator/currentRefreshToken.decorator';
import { ExtractJwt } from 'passport-jwt';
import { Public } from 'src/core/decorator/public.decorator';
import { RefreshTokenGuard } from 'src/core/guard/refreshToken.guard';
import { Env } from 'src/core/config';

@Controller('auth')
export class AuthController {
  private readonly isLocal: boolean;

  constructor(private readonly authService: AuthService) {
    this.isLocal = process.env.NODE_ENV === Env.local;
  }

  private setRefreshTokenCookie(
    res: ExpressResponse,
    refreshToken: string,
  ): void {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: !this.isLocal,
      secure: !this.isLocal,
      sameSite: this.isLocal ? 'none' : 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearRefreshTokenCookie(res: ExpressResponse): void {
    res.clearCookie('refreshToken', {
      httpOnly: !this.isLocal,
      secure: !this.isLocal,
      sameSite: this.isLocal ? 'none' : 'strict',
    });
  }

  @Public()
  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() body: SignUpBody) {
    return this.authService.signUp(body);
  }

  @Public()
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() body: SignInBody,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const tokenPair = await this.authService.signIn(body);
    this.setRefreshTokenCookie(res, tokenPair.refreshToken);

    return { accessToken: tokenPair.accessToken };
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  async signOut(
    @CurrentUser() user: User,
    @Request() req: Request,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const accessToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req) ?? '';

    this.clearRefreshTokenCookie(res);

    return this.authService.signOut(user.id, accessToken);
  }

  @Public()
  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentRefreshToken() refreshToken: string,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const tokenPair = await this.authService.refreshTokens(refreshToken);
    this.setRefreshTokenCookie(res, tokenPair.refreshToken);

    return { accessToken: tokenPair.accessToken };
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LoggerService } from 'src/core/logger/logger.service';

@Injectable()
export class RefreshTokenGuard extends AuthGuard('jwt-refresh') {
  constructor(private readonly loggerService: LoggerService) {
    super();
  }

  handleRequest(err: any, user: any, error: Error) {
    if (error) {
      throw new UnauthorizedException(error.message);
    }
    if (!user) throw new UnauthorizedException('invalid token');

    this.loggerService.info(
      this.handleRequest.name,
      `RefreshTokenGuard Success: userId: ${user.sub}`,
    );

    return user;
  }
}

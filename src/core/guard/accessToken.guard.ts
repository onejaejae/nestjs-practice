import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { LoggerService } from 'src/core/logger/logger.service';
import { IS_PUBLIC_KEY } from '../decorator/public.decorator';

@Injectable()
export class AccessTokenGuard extends AuthGuard('jwt-access') {
  constructor(
    private readonly reflector: Reflector,
    private readonly loggerService: LoggerService,
  ) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err) throw new UnauthorizedException(err.message);
    if (!user) throw new UnauthorizedException('invalid token');

    this.loggerService.info(
      this.handleRequest.name,
      `AccessTokenGuard Success: userId: ${user.id}`,
    );

    return user;
  }
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from 'src/entities/user/user.entity';

export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);

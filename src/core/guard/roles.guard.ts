import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorator/roles.decorator';
import { Role } from 'src/entities/user/user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const isAuthorized = requiredRoles.some((role) => user.role === role);
    if (!isAuthorized)
      throw new ForbiddenException(
        `RolesGuard Error: User: ${user.id}, user role: ${user.role}, Required Roles: ${requiredRoles.join(
          ', ',
        )} is not authorized`,
      );

    return true;
  }
}

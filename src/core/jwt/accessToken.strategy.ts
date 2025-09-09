import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { MoinConfigService } from 'src/core/config/config.service';
import { JwtPayload, TokenType } from 'src/core/jwt/jwt.interface';
import { User } from 'src/entities/user/user.entity';
import { UserRepository } from 'src/modules/user/repository/user.repository';
import { OmitUppercaseProps } from '../database/typeorm/typeorm.interface';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor(
    private configService: MoinConfigService,
    private userRepository: UserRepository,
  ) {
    const jwtConfig = configService.getJwtConfig();
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.JWT_ACCESS_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<OmitUppercaseProps<User>> {
    if (payload.type !== TokenType.ACCESS) {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.userRepository.findOneByFilters({
      id: payload.sub,
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}

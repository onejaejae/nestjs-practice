import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { JwtService } from 'src/core/jwt/jwt.service';
import { User } from 'src/entities/user/user.entity';
import { TokenPair } from 'src/core/jwt/jwt.interface';
import { LoggerService } from 'src/core/logger/logger.service';
import { IHashService, HASH_SERVICE } from 'src/core/hash/hash.interface';
import { INotificationService, NOTIFICATION_SERVICE } from 'src/core/notification/notification.interface';
import { Transactional } from 'typeorm-transactional';
import { SignUpBody } from './dto/request/signUp.body';
import { UserRepository } from '../user/repository/user.repository';
import { SignInBody } from './dto/request/signIn.body';
import { OmitUppercaseProps } from 'src/core/database/typeorm/typeorm.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly loggerService: LoggerService,
    @Inject(HASH_SERVICE) private readonly hashService: IHashService,
    @Inject(NOTIFICATION_SERVICE) private readonly notificationService: INotificationService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<OmitUppercaseProps<User> | null> {
    try {
      const user = await this.userRepository.findOneByFilters({
        email,
      });
      if (!user) {
        return null;
      }

      const isPasswordValid = await this.hashService.compare(
        password,
        user.password,
      );
      if (!isPasswordValid) {
        return null;
      }

      return user;
    } catch (error) {
      this.loggerService.error(
        this.validateUser.name,
        error,
        'Failed to validate user',
      );
      return null;
    }
  }

  @Transactional()
  async signUp(body: SignUpBody): Promise<void> {
    const { email, password, nickname } = body;

    // Check if user already exists
    const existingUser = await this.userRepository.findOneByFilters({
      email,
    });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Hash password
    const hashedPassword = await this.hashService.hash(password);

    // Create user
    await this.userRepository.save(body.toEntity(hashedPassword));

    // Send welcome notification
    await this.notificationService.sendWelcomeNotification(email, nickname);
  }

  async signIn(body: SignInBody): Promise<TokenPair> {
    const { email, password } = body;

    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    return this.jwtService.generateTokenPair(user.id);
  }

  async signOut(userId: User['id'], accessToken: string): Promise<void> {
    await this.jwtService.revokeAllUserTokens(userId, accessToken);
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    return this.jwtService.refreshTokens(refreshToken);
  }
}

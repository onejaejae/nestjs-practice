import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { mockDeep, MockProxy } from 'jest-mock-extended';
import { plainToInstance } from 'class-transformer';
import { AuthService } from '../auth.service';
import { UserRepository } from '../../user/repository/user.repository';
import { JwtService } from 'src/core/jwt/jwt.service';
import { LoggerService } from 'src/core/logger/logger.service';
import { HASH_SERVICE, IHashService } from 'src/core/hash/hash.interface';
import {
  INotificationService,
  NOTIFICATION_SERVICE,
} from 'src/core/notification/notification.interface';
import { SignUpBody } from '../dto/request/signUp.body';
import { User } from 'src/entities/user/user.entity';

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: MockProxy<UserRepository>;
  let jwtService: MockProxy<JwtService>;
  let hashService: MockProxy<IHashService>;
  let notificationService: MockProxy<INotificationService>;
  let loggerService: MockProxy<LoggerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService],
    })
      .useMocker(() => mockDeep<any>())
      .compile();

    authService = module.get<AuthService>(AuthService);
    userRepository = module.get(UserRepository);
    jwtService = module.get(JwtService);
    hashService = module.get(HASH_SERVICE);
    notificationService = module.get(NOTIFICATION_SERVICE);
    loggerService = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    const signUpDto = plainToInstance(SignUpBody, {
      email: 'test@example.com',
      password: 'password123',
      nickname: 'tester',
    });
    const hashedPassword = 'hashedPassword';

    it('should successfully sign up a new user', async () => {
      // Given
      userRepository.findOneByFilters.mockResolvedValue(null);
      hashService.hash.mockResolvedValue(hashedPassword);

      // When
      await authService.signUp(signUpDto);

      // Then
      expect(userRepository.findOneByFilters).toHaveBeenCalledWith({
        email: signUpDto.email,
      });
      expect(hashService.hash).toHaveBeenCalledWith(signUpDto.password);
      expect(userRepository.save).toHaveBeenCalledWith(
        signUpDto.toEntity(hashedPassword),
      );
      expect(notificationService.sendWelcomeNotification).toHaveBeenCalledTimes(1);
      expect(notificationService.sendWelcomeNotification).toHaveBeenCalledWith(
        signUpDto.email,
        signUpDto.nickname,
      );
    });

    it('should throw ConflictException if user already exists', async () => {
      // Given
      userRepository.findOneByFilters.mockResolvedValue({ id: 'user-id' } as User);

      // When & Then
      await expect(authService.signUp(signUpDto)).rejects.toThrow(
        new ConflictException('User already exists'),
      );
      expect(notificationService.sendWelcomeNotification).not.toHaveBeenCalled();
    });
  });

  describe('signIn', () => {
    const user = { id: 'user-id', email: 'test@example.com', password: 'hashed' } as User;
    const tokens = { accessToken: 'at', refreshToken: 'rt' };

    it('should return a token pair for valid credentials', async () => {
      // Given
      userRepository.findOneByFilters.mockResolvedValue(user);
      hashService.compare.mockResolvedValue(true);
      jwtService.generateTokenPair.mockResolvedValue(tokens);

      // When
      const result = await authService.signIn({ email: 'test@example.com', password: 'password' });

      // Then
      expect(result).toEqual(tokens);
      expect(jwtService.generateTokenPair).toHaveBeenCalledWith(user.id);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      // Given
      userRepository.findOneByFilters.mockResolvedValue(null);

      // When & Then
      await expect(authService.signIn({ email: 'test@example.com', password: 'wrong' })).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });
  });

  describe('validateUser', () => {
    const email = 'test@example.com';
    const password = 'password123';
    const hashedPassword = 'hashedPassword';
    const user = { email, password: hashedPassword } as User;

    it('should return user if credentials are valid', async () => {
      // Given
      userRepository.findOneByFilters.mockResolvedValue(user);
      hashService.compare.mockResolvedValue(true);

      // When
      const result = await authService.validateUser(email, password);

      // Then
      expect(result).toEqual(user);
    });

    it('should return null if user is not found', async () => {
      // Given
      userRepository.findOneByFilters.mockResolvedValue(null);

      // When
      const result = await authService.validateUser(email, password);

      // Then
      expect(result).toBeNull();
      expect(hashService.compare).not.toHaveBeenCalled();
    });

    it('should return null if password is not valid', async () => {
      // Given
      userRepository.findOneByFilters.mockResolvedValue(user);
      hashService.compare.mockResolvedValue(false);

      // When
      const result = await authService.validateUser(email, password);

      // Then
      expect(result).toBeNull();
    });

    it('should return null and log error if an exception occurs', async () => {
      // Given
      const error = new Error('Database error');
      userRepository.findOneByFilters.mockRejectedValue(error);

      // When
      const result = await authService.validateUser(email, password);

      // Then
      expect(result).toBeNull();
      expect(loggerService.error).toHaveBeenCalledWith(
        'validateUser',
        error,
        'Failed to validate user',
      );
    });
  });

  describe('signOut', () => {
    it('should call jwtService.revokeAllUserTokens', async () => {
      // Given
      const userId = 'user-id';
      const accessToken = 'access-token';

      // When
      await authService.signOut(userId, accessToken);

      // Then
      expect(jwtService.revokeAllUserTokens).toHaveBeenCalledWith(userId, accessToken);
    });
  });

  describe('refreshTokens', () => {
    it('should call jwtService.refreshTokens', async () => {
      // Given
      const refreshToken = 'refresh-token';
      const tokens = { accessToken: 'at', refreshToken: 'rt' };
      jwtService.refreshTokens.mockResolvedValue(tokens);

      // When
      const result = await authService.refreshTokens(refreshToken);

      // Then
      expect(jwtService.refreshTokens).toHaveBeenCalledWith(refreshToken);
      expect(result).toEqual(tokens);
    });
  });
});

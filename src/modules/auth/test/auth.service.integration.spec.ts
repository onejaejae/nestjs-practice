import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { DataSource } from 'typeorm';
import { AuthService } from '../auth.service';
import { AuthModule } from '../auth.module';
import { UserRepository } from '../../user/repository/user.repository';
import { Role } from 'src/entities/user/user.interface';
import { CoreModule } from 'src/core/core.module';
import { TestFactoryModule } from '../../../../test/factories/factory.module';
import { SignUpFactory } from '../../../../test/factories/auth/signUp.factory';
import { SignInFactory } from '../../../../test/factories/auth/signIn.factory';
import { UserFactory } from '../../../../test/factories/user/user.factory';
import { DEFAULT_PASSWORD } from '../../../../test/factories/auth/signUp.factory';
import { User } from 'src/entities/user/user.entity';
import { HashModule } from 'src/core/hash/hash.module';
import { NotificationModule } from 'src/core/notification/notification.module';

describe('AuthService Integration Tests', () => {
  let service: AuthService;
  let module: TestingModule;
  let dataSource: DataSource;
  let userRepository: UserRepository;
  let signUpFactory: SignUpFactory;
  let signInFactory: SignInFactory;
  let userFactory: UserFactory;
  let app: INestApplication;

  beforeAll(async () => {
    initializeTransactionalContext();

    module = await Test.createTestingModule({
      imports: [
        CoreModule,
        HashModule,
        NotificationModule,
        AuthModule,
        TestFactoryModule,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    service = module.get<AuthService>(AuthService);
    dataSource = module.get<DataSource>(DataSource);
    userRepository = module.get<UserRepository>(UserRepository);
    signUpFactory = module.get<SignUpFactory>(SignUpFactory);
    signInFactory = module.get<SignInFactory>(SignInFactory);
    userFactory = module.get<UserFactory>(UserFactory);
  });

  afterAll(async () => {
    await module.close();
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await userRepository.clear();
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  });

  describe('signUp Integration', () => {
    it('전체 회원가입 프로세스가 성공적으로 동작해야 합니다', async () => {
      // Arrange
      const signUpBody = signUpFactory.create();

      // Act
      await service.signUp(signUpBody);

      // Assert
      const savedUser = await userRepository.findOneByFilters({
        email: signUpBody.email,
      });

      expect(savedUser).toBeTruthy();
      expect(savedUser?.email).toBe(signUpBody.email);
      expect(savedUser?.nickname).toBe(signUpBody.nickname);
      expect(savedUser?.role).toBe(Role.USER);
      expect(savedUser?.score).toBe(0);
      expect(savedUser?.password).not.toBe(signUpBody.password);
    });

    it('중복된 이메일로 회원가입 시 ConflictException이 발생해야 합니다', async () => {
      // Arrange
      const email = 'duplicate@example.com';
      const firstSignUpBody = signUpFactory.create({ email });
      await service.signUp(firstSignUpBody);

      const secondSignUpBody = signUpFactory.create({ email });

      // Act & Assert
      await expect(service.signUp(secondSignUpBody)).rejects.toThrow(
        new ConflictException('User already exists'),
      );

      const users = await userRepository.findMany({ email });
      expect(users).toHaveLength(1);
      expect(users[0].nickname).toBe(firstSignUpBody.nickname);
    });
  });

  describe('validateUser Integration', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await userFactory.create();
    });

    it('올바른 자격 증명으로 사용자 검증이 성공해야 합니다', async () => {
      // Act
      const result = await service.validateUser(
        testUser.email,
        DEFAULT_PASSWORD,
      );

      // Assert
      expect(result).toBeTruthy();
      expect(result?.email).toBe(testUser.email);
      expect(result?.nickname).toBe(testUser.nickname);
      expect(result?.role).toBe(Role.USER);
    });

    it('존재하지 않는 사용자에 대해 null을 반환해야 합니다', async () => {
      // Act
      const result = await service.validateUser(
        'nonexistent@example.com',
        DEFAULT_PASSWORD,
      );

      // Assert
      expect(result).toBeNull();
    });

    it('잘못된 비밀번호에 대해 null을 반환해야 합니다', async () => {
      // Act
      const result = await service.validateUser(
        testUser.email,
        'wrongpassword',
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('signIn Integration', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await userFactory.create();
    });

    it('올바른 자격 증명으로 로그인이 성공해야 합니다', async () => {
      // Arrange
      const signInBody = signInFactory.create({
        email: testUser.email,
        password: DEFAULT_PASSWORD,
      });

      // Act
      const result = await service.signIn(signInBody);

      // Assert
      expect(result).toBeTruthy();
      expect(result.accessToken).toBeDefined();
      expect(result.accessToken.length).toBeGreaterThan(0);
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken.length).toBeGreaterThan(0);
    });

    it('잘못된 이메일로 로그인 시 UnauthorizedException이 발생해야 합니다', async () => {
      // Arrange
      const signInBody = signInFactory.create({ email: 'wrong@example.com' });

      // Act & Assert
      await expect(service.signIn(signInBody)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });

    it('잘못된 비밀번호로 로그인 시 UnauthorizedException이 발생해야 합니다', async () => {
      // Arrange
      const signInBody = signInFactory.create({
        email: testUser.email,
        password: 'wrongpassword',
      });

      // Act & Assert
      await expect(service.signIn(signInBody)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials'),
      );
    });
  });

  describe('signOut Integration', () => {
    let testUser: User;
    let accessToken: string;

    beforeEach(async () => {
      testUser = await userFactory.create();

      const signInBody = signInFactory.create({
        email: testUser.email,
        password: DEFAULT_PASSWORD,
      });

      const tokenPair = await service.signIn(signInBody);
      accessToken = tokenPair.accessToken;
    });

    it('로그아웃이 성공적으로 동작해야 합니다', async () => {
      // Act & Assert
      await expect(
        service.signOut(testUser.id, accessToken),
      ).resolves.not.toThrow();
    });
  });

  describe('refreshTokens Integration', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const testUser = await userFactory.create();

      const signInBody = signInFactory.create({
        email: testUser.email,
        password: DEFAULT_PASSWORD,
      });

      const tokenPair = await service.signIn(signInBody);
      refreshToken = tokenPair.refreshToken;
    });

    it('유효한 refresh token으로 토큰 갱신이 성공해야 합니다', async () => {
      // 토큰 생성 시간 차이를 위해 1초 대기
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Act
      const result = await service.refreshTokens(refreshToken);

      // Assert
      expect(result).toBeTruthy();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.accessToken).not.toBe(refreshToken);
      expect(result.refreshToken).not.toBe(refreshToken);
    });
  });

  describe('Complete User Journey Integration', () => {
    it('회원가입부터 로그아웃까지 전체 플로우가 성공적으로 동작해야 합니다', async () => {
      // 1. 회원가입
      const signUpBody = signUpFactory.create();
      await service.signUp(signUpBody);

      // 2. 사용자 확인
      const savedUser = await userRepository.findOneByFilters({
        email: signUpBody.email,
      });
      expect(savedUser).toBeTruthy();

      // 3. 로그인
      const signInBody = signInFactory.create({
        email: signUpBody.email,
        password: DEFAULT_PASSWORD,
      });

      const tokenPair = await service.signIn(signInBody);
      expect(tokenPair.accessToken).toBeDefined();

      // 4. 토큰 갱신 (시간 간격을 두고)
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newTokenPair = await service.refreshTokens(tokenPair.refreshToken);
      expect(newTokenPair.accessToken).toBeDefined();
      expect(newTokenPair.accessToken).not.toBe(tokenPair.accessToken);

      // 5. 로그아웃
      await expect(
        service.signOut(savedUser!.id, newTokenPair.accessToken),
      ).resolves.not.toThrow();
    });
  });
});

# NestJS 테스트 가이드

## 목차
1. [테스트 환경 설정](#테스트-환경-설정)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [E2E Testing](#e2e-testing)
5. [테스트 패턴과 모범 사례](#테스트-패턴과-모범-사례)

## 테스트 환경 설정

### Docker를 활용한 테스트 데이터베이스 설정

테스트 환경에서는 실제 운영 데이터베이스와 분리된 환경을 사용해야 합니다.

#### docker-compose.test.yml
```yaml
version: '3.8'
services:
  mysql-test:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: test_password
      MYSQL_DATABASE: nestjs_practice_test
      MYSQL_USER: test_user
      MYSQL_PASSWORD: test_password
    ports:
      - "3307:3306"
    command: --default-authentication-plugin=mysql_native_password
    volumes:
      - mysql_test_data:/var/lib/mysql

  redis-test:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    command: redis-server --requirepass test_password

volumes:
  mysql_test_data:
```

#### 테스트 환경 변수 (.env.test)
```env
NODE_ENV=test
DB_HOST=localhost
DB_PORT=3307
DB_USERNAME=test_user
DB_PASSWORD=test_password
DB_NAME=nestjs_practice_test

REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_PASSWORD=test_password

JWT_SECRET=test_jwt_secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=test_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d
```

#### package.json 테스트 스크립트
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "test:db:up": "docker-compose -f docker-compose.test.yml up -d",
    "test:db:down": "docker-compose -f docker-compose.test.yml down -v",
    "test:integration": "npm run test:db:up && jest --config ./test/jest-integration.json && npm run test:db:down"
  }
}
```

## Unit Testing

Unit Test는 개별 컴포넌트(Service, Controller, Guard 등)를 격리된 환경에서 테스트합니다.

### 1. Service Layer Unit Testing

현재 프로젝트의 `AuthService`를 예로 한 Unit Test 구조:

#### test/unit/auth/auth.service.spec.ts
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { UserRepository } from '../../../src/modules/user/repository/user.repository';
import { JwtService } from '../../../src/core/jwt/jwt.service';
import { LoggerService } from '../../../src/core/logger/logger.service';
import { HASH_SERVICE, IHashService } from '../../../src/core/hash/hash.interface';
import { NOTIFICATION_SERVICE, INotificationService } from '../../../src/core/notification/notification.interface';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let hashService: jest.Mocked<IHashService>;
  let notificationService: jest.Mocked<INotificationService>;

  // Test Data Factory
  const createMockUser = (overrides = {}) => ({
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    password: 'hashedPassword',
    nickname: 'testuser',
    role: 'user' as const,
    score: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    // Mock implementations
    const mockUserRepository = {
      findOneByFilters: jest.fn(),
      save: jest.fn(),
    };

    const mockJwtService = {
      generateTokenPair: jest.fn(),
      revokeAllUserTokens: jest.fn(),
      refreshTokens: jest.fn(),
    };

    const mockHashService = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    const mockNotificationService = {
      sendWelcomeNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: LoggerService, useValue: { error: jest.fn(), info: jest.fn() } },
        { provide: HASH_SERVICE, useValue: mockHashService },
        { provide: NOTIFICATION_SERVICE, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(UserRepository);
    jwtService = module.get(JwtService);
    hashService = module.get(HASH_SERVICE);
    notificationService = module.get(NOTIFICATION_SERVICE);
  });

  describe('validateUser', () => {
    it('사용자가 존재하고 비밀번호가 올바른 경우 사용자를 반환해야 합니다', async () => {
      // Arrange
      const mockUser = createMockUser();
      const email = 'test@example.com';
      const password = 'password123';

      userRepository.findOneByFilters.mockResolvedValue(mockUser);
      hashService.compare.mockResolvedValue(true);

      // Act
      const result = await service.validateUser(email, password);

      // Assert
      expect(result).toEqual(mockUser);
      expect(userRepository.findOneByFilters).toHaveBeenCalledWith({ email });
      expect(hashService.compare).toHaveBeenCalledWith(password, mockUser.password);
    });

    it('사용자가 존재하지 않는 경우 null을 반환해야 합니다', async () => {
      // Arrange
      userRepository.findOneByFilters.mockResolvedValue(null);

      // Act
      const result = await service.validateUser('nonexistent@example.com', 'password');

      // Assert
      expect(result).toBeNull();
      expect(hashService.compare).not.toHaveBeenCalled();
    });

    it('비밀번호가 틀린 경우 null을 반환해야 합니다', async () => {
      // Arrange
      const mockUser = createMockUser();
      userRepository.findOneByFilters.mockResolvedValue(mockUser);
      hashService.compare.mockResolvedValue(false);

      // Act
      const result = await service.validateUser('test@example.com', 'wrongpassword');

      // Assert
      expect(result).toBeNull();
      expect(hashService.compare).toHaveBeenCalledWith('wrongpassword', mockUser.password);
    });
  });

  describe('signUp', () => {
    it('새 사용자 회원가입이 성공해야 합니다', async () => {
      // Arrange
      const signUpData = {
        email: 'new@example.com',
        password: 'password123',
        nickname: 'newuser',
        toEntity: jest.fn().mockReturnValue(createMockUser()),
      };

      userRepository.findOneByFilters.mockResolvedValue(null);
      hashService.hash.mockResolvedValue('hashedPassword');
      userRepository.save.mockResolvedValue(createMockUser());

      // Act
      await service.signUp(signUpData);

      // Assert
      expect(userRepository.findOneByFilters).toHaveBeenCalledWith({ email: signUpData.email });
      expect(hashService.hash).toHaveBeenCalledWith(signUpData.password);
      expect(userRepository.save).toHaveBeenCalled();
      expect(notificationService.sendWelcomeNotification).toHaveBeenCalledWith(
        signUpData.email,
        signUpData.nickname
      );
    });

    it('이미 존재하는 사용자인 경우 ConflictException을 던져야 합니다', async () => {
      // Arrange
      const signUpData = {
        email: 'existing@example.com',
        password: 'password123',
        nickname: 'existinguser',
        toEntity: jest.fn(),
      };

      userRepository.findOneByFilters.mockResolvedValue(createMockUser());

      // Act & Assert
      await expect(service.signUp(signUpData)).rejects.toThrow(ConflictException);
      expect(hashService.hash).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });
});
```

### 2. Controller Unit Testing

#### test/unit/user/user.controller.spec.ts
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '../../../src/modules/user/user.controller';
import { UserService } from '../../../src/modules/user/user.service';

describe('UserController', () => {
  let controller: UserController;
  let service: jest.Mocked<UserService>;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    nickname: 'testuser',
    role: 'user' as const,
    score: 100,
  };

  beforeEach(async () => {
    const mockUserService = {
      getUser: jest.fn(),
      updateUser: jest.fn(),
      getUserRank: jest.fn(),
      getUsersByRank: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get(UserService);
  });

  describe('getMe', () => {
    it('현재 사용자 정보를 반환해야 합니다', async () => {
      // Arrange
      service.getUser.mockResolvedValue(mockUser);

      // Act
      const result = await controller.getMe(mockUser);

      // Assert
      expect(result).toEqual(mockUser);
      expect(service.getUser).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('updateMe', () => {
    it('사용자 정보를 업데이트해야 합니다', async () => {
      // Arrange
      const updateData = { nickname: 'updateduser' };
      const updatedUser = { ...mockUser, nickname: 'updateduser' };
      service.updateUser.mockResolvedValue(updatedUser);

      // Act
      const result = await controller.updateMe(mockUser, updateData);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(service.updateUser).toHaveBeenCalledWith(mockUser.id, updateData);
    });
  });
});
```

### 3. Guard Unit Testing

#### test/unit/guard/roles.guard.spec.ts
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../../src/core/guard/roles.guard';
import { ROLES_KEY } from '../../../src/core/decorator/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);
  });

  const createMockExecutionContext = (user: any): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as any);

  it('역할이 지정되지 않은 경우 접근을 허용해야 합니다', () => {
    // Arrange
    const context = createMockExecutionContext({ id: '1', role: 'user' });
    reflector.getAllAndOverride.mockReturnValue(null);

    // Act
    const result = guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
  });

  it('사용자가 필요한 역할을 가진 경우 접근을 허용해야 합니다', () => {
    // Arrange
    const context = createMockExecutionContext({ id: '1', role: 'admin' });
    reflector.getAllAndOverride.mockReturnValue(['admin', 'user']);

    // Act
    const result = guard.canActivate(context);

    // Assert
    expect(result).toBe(true);
  });

  it('사용자가 필요한 역할을 가지지 않은 경우 ForbiddenException을 던져야 합니다', () => {
    // Arrange
    const context = createMockExecutionContext({ id: '1', role: 'user' });
    reflector.getAllAndOverride.mockReturnValue(['admin']);

    // Act & Assert
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
```

## Integration Testing

Integration Test는 여러 컴포넌트가 함께 작동하는 방식을 테스트합니다.

### 1. 데이터베이스 연동 테스트

#### test/integration/auth/auth.service.integration.spec.ts
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { User } from '../../../src/entities/user/user.entity';
import { UserRepository } from '../../../src/modules/user/repository/user.repository';
import { getTestTypeOrmConfig } from '../../utils/test-database';

describe('AuthService Integration', () => {
  let service: AuthService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(getTestTypeOrmConfig()),
        TypeOrmModule.forFeature([User]),
      ],
      providers: [
        AuthService,
        UserRepository,
        // ... other real providers
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // 테스트 데이터베이스 초기화
    const repository = module.get<UserRepository>(UserRepository);
    await repository.query('DELETE FROM users');
  });

  describe('사용자 회원가입 프로세스', () => {
    it('전체 회원가입 프로세스가 정상적으로 작동해야 합니다', async () => {
      // Arrange
      const signUpData = {
        email: 'integration@example.com',
        password: 'password123',
        nickname: 'integrationuser',
        toEntity: (hashedPassword: string) => ({
          email: 'integration@example.com',
          password: hashedPassword,
          nickname: 'integrationuser',
          role: 'user' as const,
          score: 0,
        }),
      };

      // Act
      await service.signUp(signUpData);

      // Assert
      const user = await service.validateUser(signUpData.email, signUpData.password);
      expect(user).toBeTruthy();
      expect(user.email).toBe(signUpData.email);
      expect(user.nickname).toBe(signUpData.nickname);
    });
  });
});
```

### 2. 캐시 연동 테스트

#### test/integration/user/user.service.integration.spec.ts
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../../../src/modules/user/user.service';
import { CacheModule } from '../../../src/core/cache/cache.module';
import { getTestRedisConfig } from '../../utils/test-cache';

describe('UserService Cache Integration', () => {
  let service: UserService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        CacheModule.forRoot(getTestRedisConfig()),
        // ... other modules
      ],
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('사용자 조회 캐싱', () => {
    it('첫 번째 조회 후 캐시에서 데이터를 가져와야 합니다', async () => {
      // Arrange
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      
      // Act
      const firstCall = await service.getUser(userId);
      const secondCall = await service.getUser(userId);

      // Assert
      expect(firstCall).toEqual(secondCall);
      // 캐시 히트 확인 로직
    });
  });
});
```

## E2E Testing

E2E 테스트는 실제 HTTP 요청을 통해 전체 애플리케이션 플로우를 테스트합니다.

### 1. 인증 플로우 E2E 테스트

#### test/e2e/auth.e2e-spec.ts
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { getTestTypeOrmConfig } from '../utils/test-database';

describe('Authentication E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(TypeOrmModule.forRoot())
      .useModule(TypeOrmModule.forRoot(getTestTypeOrmConfig()))
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // 데이터베이스 초기화
    const connection = app.get(Connection);
    await connection.query('DELETE FROM users');
  });

  describe('/auth/signup (POST)', () => {
    it('올바른 데이터로 회원가입이 성공해야 합니다', async () => {
      const signUpData = {
        email: 'e2e@example.com',
        password: 'password123',
        nickname: 'e2euser',
      };

      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(signUpData)
        .expect(201);
    });

    it('중복된 이메일로 회원가입 시 409 에러가 발생해야 합니다', async () => {
      const signUpData = {
        email: 'duplicate@example.com',
        password: 'password123',
        nickname: 'user1',
      };

      // 첫 번째 회원가입
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send(signUpData)
        .expect(201);

      // 중복 회원가입 시도
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({ ...signUpData, nickname: 'user2' })
        .expect(409);
    });

    it('유효하지 않은 이메일 형식은 400 에러가 발생해야 합니다', async () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'password123',
          nickname: 'user',
        })
        .expect(400);
    });
  });

  describe('/auth/signin (POST)', () => {
    beforeEach(async () => {
      // 테스트 사용자 생성
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'signin@example.com',
          password: 'password123',
          nickname: 'signinuser',
        });
    });

    it('올바른 자격 증명으로 로그인이 성공해야 합니다', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .send({
          email: 'signin@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.headers['set-cookie']).toBeDefined(); // refreshToken 쿠키
    });

    it('틀린 비밀번호로 로그인 시 401 에러가 발생해야 합니다', async () => {
      return request(app.getHttpServer())
        .post('/auth/signin')
        .send({
          email: 'signin@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('Protected Routes', () => {
    let accessToken: string;

    beforeEach(async () => {
      // 사용자 생성 및 로그인
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: 'protected@example.com',
          password: 'password123',
          nickname: 'protecteduser',
        });

      const response = await request(app.getHttpServer())
        .post('/auth/signin')
        .send({
          email: 'protected@example.com',
          password: 'password123',
        });

      accessToken = response.body.accessToken;
    });

    it('유효한 토큰으로 보호된 라우트에 접근할 수 있어야 합니다', async () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('토큰 없이 보호된 라우트에 접근 시 401 에러가 발생해야 합니다', async () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .expect(401);
    });
  });
});
```

### 2. Post CRUD E2E 테스트

#### test/e2e/post.e2e-spec.ts
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Post E2E', () => {
  let app: INestApplication;
  let userAccessToken: string;
  let adminAccessToken: string;
  let testPostId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 테스트 사용자 및 관리자 생성
    await setupTestUsers();
  });

  async function setupTestUsers() {
    // 일반 사용자 생성
    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'user@example.com',
        password: 'password123',
        nickname: 'testuser',
      });

    const userResponse = await request(app.getHttpServer())
      .post('/auth/signin')
      .send({
        email: 'user@example.com',
        password: 'password123',
      });

    userAccessToken = userResponse.body.accessToken;

    // 관리자 계정은 별도로 생성하거나 시드 데이터 사용
  }

  describe('/posts (GET)', () => {
    it('공개 포스트 목록을 조회할 수 있어야 합니다', async () => {
      const response = await request(app.getHttpServer())
        .get('/posts')
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
    });

    it('페이징 파라미터가 정상적으로 작동해야 합니다', async () => {
      return request(app.getHttpServer())
        .get('/posts?page=1&limit=10')
        .expect(200);
    });
  });

  describe('/posts (POST)', () => {
    it('인증된 사용자가 포스트를 생성할 수 있어야 합니다', async () => {
      const postData = {
        title: 'Test Post',
        content: 'This is a test post content',
      };

      const response = await request(app.getHttpServer())
        .post('/posts')
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(postData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(postData.title);
      testPostId = response.body.id;
    });

    it('인증되지 않은 사용자는 포스트를 생성할 수 없어야 합니다', async () => {
      return request(app.getHttpServer())
        .post('/posts')
        .send({
          title: 'Unauthorized Post',
          content: 'This should fail',
        })
        .expect(401);
    });
  });

  describe('/posts/:id (PATCH)', () => {
    it('포스트 작성자가 포스트를 수정할 수 있어야 합니다', async () => {
      const updateData = {
        title: 'Updated Test Post',
        content: 'Updated content',
      };

      return request(app.getHttpServer())
        .patch(`/posts/${testPostId}`)
        .set('Authorization', `Bearer ${userAccessToken}`)
        .send(updateData)
        .expect(200);
    });

    it('다른 사용자는 포스트를 수정할 수 없어야 합니다', async () => {
      // 다른 사용자 토큰으로 테스트
      return request(app.getHttpServer())
        .patch(`/posts/${testPostId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ title: 'Hacked Title' })
        .expect(403);
    });
  });
});
```

## 테스트 패턴과 모범 사례

### 1. Test Data Factory 패턴

#### test/factories/user.factory.ts
```typescript
import { User } from '../../src/entities/user/user.entity';

export class UserFactory {
  static create(overrides: Partial<User> = {}): User {
    return {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      password: 'hashedPassword',
      nickname: 'testuser',
      role: 'user',
      score: 0,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
      ...overrides,
    } as User;
  }

  static createAdmin(overrides: Partial<User> = {}): User {
    return this.create({
      role: 'admin',
      email: 'admin@example.com',
      nickname: 'admin',
      ...overrides,
    });
  }

  static createMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, (_, index) =>
      this.create({
        id: `user-${index + 1}`,
        email: `user${index + 1}@example.com`,
        nickname: `user${index + 1}`,
        ...overrides,
      }),
    );
  }
}
```

### 2. Custom Test Matchers

#### test/utils/custom-matchers.ts
```typescript
import { ValidationError } from 'class-validator';

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveValidationError(field: string): R;
    }
  }
}

expect.extend({
  toHaveValidationError(received: ValidationError[], field: string) {
    const hasError = received.some(error => error.property === field);
    
    if (hasError) {
      return {
        message: () => `Expected not to have validation error for field "${field}"`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected to have validation error for field "${field}"`,
        pass: false,
      };
    }
  },
});
```

### 3. 테스트 설정 파일들

#### test/utils/test-database.ts
```typescript
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../../src/entities/user/user.entity';
import { Post } from '../../src/entities/post/post.entity';

export function getTestTypeOrmConfig(): TypeOrmModuleOptions {
  return {
    type: 'mysql',
    host: 'localhost',
    port: 3307,
    username: 'test_user',
    password: 'test_password',
    database: 'nestjs_practice_test',
    entities: [User, Post],
    synchronize: true,
    dropSchema: true,
    logging: false,
  };
}
```

#### test/utils/test-cache.ts
```typescript
export function getTestRedisConfig() {
  return {
    host: 'localhost',
    port: 6380,
    password: 'test_password',
    db: 1, // 테스트 전용 DB
  };
}
```

#### jest.config.js (Integration 테스트용)
```javascript
module.exports = {
  displayName: 'Integration Tests',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
  ],
  coverageDirectory: '../coverage-integration',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^libs/(.*)$': '<rootDir>/libs/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup/integration-setup.ts'],
};
```

#### test/setup/integration-setup.ts
```typescript
import 'reflect-metadata';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

beforeAll(async () => {
  // 테스트 데이터베이스 컨테이너 시작
  await execAsync('docker-compose -f docker-compose.test.yml up -d');
  
  // 데이터베이스가 준비될 때까지 대기
  await new Promise(resolve => setTimeout(resolve, 5000));
}, 30000);

afterAll(async () => {
  // 테스트 데이터베이스 정리
  await execAsync('docker-compose -f docker-compose.test.yml down -v');
}, 30000);
```

### 4. 테스트 실행 가이드

#### 전체 테스트 실행
```bash
# 단위 테스트
npm test

# 통합 테스트 (데이터베이스 포함)
npm run test:integration

# E2E 테스트
npm run test:e2e

# 커버리지 포함 테스트
npm run test:cov

# 특정 테스트 파일 실행
npm test -- auth.service.spec.ts

# Watch 모드로 테스트 실행
npm run test:watch
```

#### CI/CD 파이프라인에서의 테스트
```yaml
# GitHub Actions 예시
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: test_password
          MYSQL_DATABASE: nestjs_practice_test
        ports:
          - 3307:3306
          
      redis:
        image: redis:7-alpine
        ports:
          - 6380:6379

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm test
        
      - name: Run integration tests
        run: npm run test:integration
        
      - name: Run E2E tests
        run: npm run test:e2e
```

이 가이드를 통해 NestJS 프로젝트에서 체계적인 테스트를 구현할 수 있습니다. 각 테스트 레벨에서 적절한 모킹과 실제 연동을 통해 신뢰성 있는 테스트 환경을 구축할 수 있습니다.
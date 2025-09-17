import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { CoreModule } from '../../src/core/core.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import {
  DEFAULT_PASSWORD,
  SignUpFactory,
} from '../factories/auth/signUp.factory';
import { SignInFactory } from '../factories/auth/signIn.factory';
import { UserFactory } from '../factories/user/user.factory';
import { TestFactoryModule } from '../factories/factory.module';
import { setNestApp } from 'src/setNestApp';
import { JwtService } from '../../src/core/jwt/jwt.service';
import { User } from '../../src/entities/user/user.entity';

describe('AuthService E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let signUpFactory: SignUpFactory;
  let signInFactory: SignInFactory;
  let userFactory: UserFactory;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CoreModule, AuthModule, TestFactoryModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setNestApp(app);
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    signUpFactory = moduleFixture.get<SignUpFactory>(SignUpFactory);
    signInFactory = moduleFixture.get<SignInFactory>(SignInFactory);
    userFactory = moduleFixture.get<UserFactory>(UserFactory);
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await dataSource.query('TRUNCATE TABLE user');
    await dataSource.query('TRUNCATE TABLE post');
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  });

  describe('/auth/sign-up (POST)', () => {
    it('성공적으로 회원가입해야 한다', async () => {
      const signUpBody = signUpFactory.create();

      const response = await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send(signUpBody)
        .expect(201);

      expect(response.body).toEqual({ success: true });
    });

    it('중복된 이메일로 회원가입 시 409 에러가 발생해야 한다', async () => {
      const signUpBody = signUpFactory.create();

      await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send(signUpBody)
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/auth/sign-up')
        .send(signUpBody)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(409);
      expect(response.body.message).toBe('User already exists');
    });
  });

  describe('/auth/sign-in (POST)', () => {
    const mockEmail = 'mock@naver.com';

    beforeEach(async () => {
      await userFactory.create({ email: mockEmail });
    });

    it('성공적으로 로그인해야 한다', async () => {
      const signInBody = signInFactory.create({
        email: mockEmail,
        password: DEFAULT_PASSWORD,
      });

      const response = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send(signInBody)
        .expect(200);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('잘못된 비밀번호로 로그인 시 401 에러가 발생해야 한다', async () => {
      const signInBody = signInFactory.create();
      signInBody.password = 'wrong-password';

      const response = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send(signInBody)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('존재하지 않는 사용자로 로그인 시 401 에러가 발생해야 한다', async () => {
      const nonExistentUser = signInFactory.create();
      nonExistentUser.email = 'nonexistent@example.com';

      const response = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send(nonExistentUser)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('/auth/refresh (POST)', () => {
    let refreshTokenCookie: string;
    let user: User;

    beforeEach(async () => {
      user = await userFactory.create();
      const tokenPair = await jwtService.generateTokenPair(user.id);
      refreshTokenCookie = `refreshToken=${tokenPair.refreshToken}; HttpOnly; Secure; Path=/`;
    });

    it('유효한 리프레시 토큰으로 새로운 토큰을 발급받아야 한다', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', refreshTokenCookie)
        .expect(200);

      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('리프레시 토큰 없이 요청 시 401 에러가 발생해야 한다', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(401);
      expect(response.body.message).toBe('No auth token');
    });
  });

  describe('/auth/sign-out (POST)', () => {
    let accessToken: string;
    let refreshTokenCookie: string;
    let user: User;

    beforeEach(async () => {
      user = await userFactory.create();
      const tokenPair = await jwtService.generateTokenPair(user.id);
      accessToken = tokenPair.accessToken;
      refreshTokenCookie = `refreshToken=${tokenPair.refreshToken}; HttpOnly; Secure; Path=/`;
    });

    it('성공적으로 로그아웃해야 한다', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/sign-out')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', refreshTokenCookie)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('refreshToken=;');
    });

    it('로그아웃 후 리프레시 토큰이 무효화되어야 한다', async () => {
      await request(app.getHttpServer())
        .post('/auth/sign-out')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', refreshTokenCookie)
        .expect(200);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', refreshTokenCookie)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(401);
      expect(response.body.message).toBe('Invalid refresh token');
    });
  });
});

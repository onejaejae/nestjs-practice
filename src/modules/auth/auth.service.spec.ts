import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRepository } from '../user/repository/user.repository';
import { JwtService } from 'src/core/jwt/jwt.service';
import { LoggerService } from 'src/core/logger/logger.service';
import { HASH_SERVICE } from 'src/core/hash/hash.interface';
import { NOTIFICATION_SERVICE } from 'src/core/notification/notification.interface';
import { MockNotificationService } from '../../../test/mocks/mock-notification.service';
import { SignUpBody } from './dto/request/signUp.body';

describe('AuthService - signUp 테스트', () => {
  let authService: AuthService;
  let mockNotificationService: MockNotificationService;
  let mockUserRepository: Partial<UserRepository>;
  let mockHashService: any;

  beforeEach(async () => {
    // 🔑 핵심: Mock 서비스 생성 (실제 이메일 발송 없음)
    mockNotificationService = new MockNotificationService();
    
    mockUserRepository = {
      findOneByFilters: jest.fn(),
      save: jest.fn(),
    };

    mockHashService = {
      hash: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: JwtService, useValue: {} },
        { provide: LoggerService, useValue: { error: jest.fn() } },
        { provide: HASH_SERVICE, useValue: mockHashService },
        { 
          provide: NOTIFICATION_SERVICE, 
          useValue: mockNotificationService // 🎯 Mock 주입!
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    mockNotificationService.clearHistory();
  });

  describe('💡 인터페이스 의존 패턴의 위력을 보자!', () => {
    const signUpData = {
      email: 'newbie@example.com',
      nickname: 'coding_hero',
      password: 'super_secret_123',
      toEntity: jest.fn().mockReturnValue({ 
        id: 'new-user-id',
        email: 'newbie@example.com',
        nickname: 'coding_hero'
      }),
    } as SignUpBody;

    it('✅ 실제 이메일 없이도 회원가입 + 알림 로직을 완벽 테스트!', async () => {
      // 🎬 Given: 테스트 환경 설정
      mockUserRepository.findOneByFilters = jest.fn().mockResolvedValue(null); // 신규 사용자
      mockHashService.hash = jest.fn().mockResolvedValue('super_hashed_password');
      mockUserRepository.save = jest.fn().mockResolvedValue({ id: 'new-user-id' });

      console.log('🧪 테스트 시작: 실제 이메일 발송 없이 회원가입 테스트');

      // 🎯 When: 회원가입 실행
      await authService.signUp(signUpData);

      // ✨ Then: 모든 것이 제대로 작동했는지 검증
      
      // 1️⃣ 사용자 생성 로직 검증
      expect(mockUserRepository.findOneByFilters).toHaveBeenCalledWith({
        email: 'newbie@example.com',
      });
      expect(mockHashService.hash).toHaveBeenCalledWith('super_secret_123');
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);

      // 2️⃣ 🔥 핵심: 알림 발송 로직 검증 (실제 이메일 X, 로직 검증 O)
      const sentNotifications = mockNotificationService.getSentNotifications();
      expect(sentNotifications).toHaveLength(1);
      expect(sentNotifications[0]).toEqual({
        email: 'newbie@example.com',
        nickname: 'coding_hero',
      });

      console.log('✅ 테스트 성공: 실제 SMTP 서버 없이도 알림 로직 완벽 검증!');
    });

    it('❌ 중복 사용자일 때는 알림을 보내지 않는다', async () => {
      // Given: 이미 존재하는 사용자
      mockUserRepository.findOneByFilters = jest.fn().mockResolvedValue({
        id: 'existing-user',
        email: 'newbie@example.com',
      });

      console.log('🧪 테스트: 중복 사용자 시 알림 발송 방지');

      // When & Then: ConflictException 발생해야 함
      await expect(authService.signUp(signUpData)).rejects.toThrow(ConflictException);

      // 🔍 핵심 검증: 알림이 발송되지 않았는지 확인
      expect(mockNotificationService.getSentNotifications()).toHaveLength(0);
      
      console.log('✅ 검증 완료: 중복 사용자 시 알림 발송 안됨');
    });

    it('⚡ 테스트 속도가 엄청 빠르다!', async () => {
      // Given
      mockUserRepository.findOneByFilters = jest.fn().mockResolvedValue(null);
      mockHashService.hash = jest.fn().mockResolvedValue('hashed');
      mockUserRepository.save = jest.fn().mockResolvedValue({ id: 'user' });

      const startTime = Date.now();

      // When: 실제 이메일 발송이었다면 수초가 걸렸을 작업
      await authService.signUp(signUpData);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Then
      expect(duration).toBeLessThan(50); // 50ms 이내 완료
      expect(mockNotificationService.getSentNotifications()).toHaveLength(1);
      
      console.log(`⚡ 테스트 실행 시간: ${duration}ms (실제 이메일: 수초 vs Mock: ${duration}ms)`);
    });
  });

  describe('🤔 만약 구체 클래스에 직접 의존했다면?', () => {
    it('💀 실제 EmailService를 사용했다면 일어날 문제들', () => {
      console.log(`
      ❌ 실제 EmailService 직접 의존 시 문제점들:
      
      1. 🐌 느린 테스트: 실제 SMTP 서버 연결로 수초 소요
      2. 📧 스팸: 테스트 실행할 때마다 실제 이메일 발송
      3. 🔒 외부 의존성: SMTP 서버 다운 시 테스트 실패
      4. 💸 비용: 이메일 발송 API 사용량 증가
      5. 🧪 테스트 격리 불가: 외부 상태에 영향받음
      6. 🔍 검증 어려움: 실제 발송 여부 확인 복잡
      
      ✅ 인터페이스 + Mock 패턴의 장점:
      
      1. ⚡ 빠른 테스트: 수 밀리초 내 완료
      2. 🎯 완벽한 제어: 성공/실패 시나리오 자유자재
      3. 🔒 완전 격리: 외부 서비스 없이도 로직 테스트
      4. 💰 무료: 실제 API 호출 없음
      5. 🧪 정확한 검증: 호출 여부, 파라미터까지 검증
      6. 🔄 반복 실행: 몇 번을 실행해도 동일한 결과
      `);
    });
  });
});
// Jest 테스트 환경 설정
import 'reflect-metadata';

// TypeORM transactional 초기화 (테스트용)
jest.mock('typeorm-transactional', () => ({
  Transactional: () => (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    return descriptor; // 데코레이터 무시
  },
  initializeTransactionalContext: jest.fn(),
}));
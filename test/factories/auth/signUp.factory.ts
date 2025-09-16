import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { SignUpBody, ISignUpBody } from '../../../src/modules/auth/dto/request/signUp.body';

export const DEFAULT_PASSWORD = 'password123';

@Injectable()
export class SignUpFactory {
  create(overrides: Partial<ISignUpBody> = {}): SignUpBody {
    const data = {
      email: overrides.email || this.generateUniqueEmail(),
      password: overrides.password || DEFAULT_PASSWORD,
      nickname: overrides.nickname || this.generateUniqueNickname(),
    };
    return plainToInstance(SignUpBody, data);
  }

  createMany(count: number, overrides: Partial<ISignUpBody> = {}): SignUpBody[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  private generateUniqueEmail(): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    return `test-${timestamp}-${randomStr}@example.com`;
  }

  private generateUniqueNickname(): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 5);
    return `user-${timestamp}-${randomStr}`;
  }
}
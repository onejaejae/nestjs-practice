import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { SignInBody, ISignInBody } from '../../../src/modules/auth/dto/request/signIn.body';
import { DEFAULT_PASSWORD } from './signUp.factory';

@Injectable()
export class SignInFactory {
  create(overrides: Partial<ISignInBody> = {}): SignInBody {
    const data = {
      email: overrides.email || this.generateEmail(),
      password: overrides.password || DEFAULT_PASSWORD,
    };
    return plainToInstance(SignInBody, data);
  }

  createMany(count: number, overrides: Partial<ISignInBody> = {}): SignInBody[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  private generateEmail(): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    return `signin-${timestamp}-${randomStr}@example.com`;
  }
}
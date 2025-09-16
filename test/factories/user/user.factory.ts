import { Injectable, Inject } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { v4 } from 'uuid';
import { User } from '../../../src/entities/user/user.entity';
import { UserRepository } from '../../../src/modules/user/repository/user.repository';
import {
  IHashService,
  HASH_SERVICE,
} from '../../../src/core/hash/hash.interface';
import { Role } from '../../../src/entities/user/user.interface';
import { DEFAULT_PASSWORD } from '../auth/signUp.factory';

@Injectable()
export class UserFactory {
  constructor(
    private readonly userRepository: UserRepository,
    @Inject(HASH_SERVICE) private readonly hashService: IHashService,
  ) {}

  async create(overrides: Partial<User> = {}): Promise<User> {
    const userData: Partial<User> = {
      id: overrides.id || v4(),
      email: overrides.email || this.generateUniqueEmail(),
      password:
        overrides.password || (await this.hashService.hash(DEFAULT_PASSWORD)),
      nickname: overrides.nickname || this.generateUniqueNickname(),
      role: overrides.role || Role.USER,
      score: overrides.score || 0,
    };

    const user = plainToInstance(User, userData);
    return this.userRepository.save(user);
  }

  async createMany(
    count: number,
    overrides: Partial<User> = {},
  ): Promise<User[]> {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push(await this.create(overrides));
    }
    return users;
  }

  async createAdmin(overrides: Partial<User> = {}): Promise<User> {
    return this.create({
      role: Role.ADMIN,
      ...overrides,
    });
  }

  private generateUniqueEmail(): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 9);
    return `user-${timestamp}-${randomStr}@example.com`;
  }

  private generateUniqueNickname(): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 5);
    return `user-${timestamp}-${randomStr}`;
  }
}

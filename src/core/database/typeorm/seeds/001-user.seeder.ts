import { User } from 'src/entities/user/user.entity';
import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { Redis } from 'ioredis';
import { CacheKeys } from 'src/core/cache/cache.interface';

export default class UserSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);
    const redis = new Redis({
      port: 6379,
      host: '127.0.0.1',
    });

    const users: Partial<User>[] = [
      {
        email: 'test',
        score: 100,
      },
      {
        email: 'test2',
        score: 200,
      },
      {
        email: 'test3',
        score: 300,
      },
      {
        email: 'test4',
        score: 400,
      },
      {
        email: 'test5',
        score: 500,
      },
      {
        email: 'test6',
        score: 600,
      },
      {
        email: 'test7',
        score: 700,
      },
      {
        email: 'test8',
        score: 800,
      },
      {
        email: 'test9',
        score: 900,
      },
      {
        email: 'test10',
        score: 1000,
      },
      {
        email: 'test11',
        score: 1100,
      },
      {
        email: 'test12',
        score: 1200,
      },
      {
        email: 'test13',
        score: 1300,
      },
      {
        email: 'test14',
        score: 1400,
      },
      {
        email: 'test15',
        score: 1500,
      },
      {
        email: 'test16',
        score: 1600,
      },
      {
        email: 'test17',
        score: 1700,
      },
      {
        email: 'test18',
        score: 1800,
      },
      {
        email: 'test19',
        score: 1900,
      },
      {
        email: 'test20',
        score: 2000,
      },
      {
        email: 'test21',
        score: 2100,
      },
      {
        email: 'test22',
        score: 2200,
      },
      {
        email: 'test23',
        score: 2300,
      },
      {
        email: 'test24',
        score: 2400,
      },
    ];

    // Create entity instances
    const userEntities = userRepository.create(users);

    // Save the created entities
    await userRepository.save(userEntities);

    for (const user of userEntities) {
      await redis.zadd(CacheKeys.UserRank, user.score ?? 0, user.id ?? '');
    }
  }
}

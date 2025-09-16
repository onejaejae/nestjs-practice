import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { v4 } from 'uuid';
import { Post } from '../../../src/entities/post/post.entity';
import { PostRepository } from '../../../src/modules/post/repository/post.repository';
import { User } from '../../../src/entities/user/user.entity';

@Injectable()
export class PostFactory {
  constructor(private readonly postRepository: PostRepository) {}

  async create(
    userId: User['id'],
    overrides: Partial<Post> = {},
  ): Promise<Post> {
    const postData: Partial<Post> = {
      id: overrides.id || v4(),
      title: overrides.title || this.generateTitle(),
      content: overrides.content || this.generateContent(),
      userId: overrides.userId || userId,
    };

    const post = plainToInstance(Post, postData);
    return this.postRepository.save(post);
  }

  async createMany(
    count: number,
    userId: User['id'],
    overrides: Partial<Post> = {},
  ): Promise<Post[]> {
    const promises = Array.from({ length: count }, () =>
      this.create(userId, overrides),
    );
    return Promise.all(promises);
  }

  async createForUser(
    user: User,
    overrides: Partial<Post> = {},
  ): Promise<Post> {
    return this.create(user.id, overrides);
  }

  private generateTitle(): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 5);
    return `Test Post Title ${timestamp}-${randomStr}`;
  }

  private generateContent(): string {
    const timestamp = Date.now();
    return `This is test post content generated at ${timestamp}. Lorem ipsum dolor sit amet.`;
  }
}

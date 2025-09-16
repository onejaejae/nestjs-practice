import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CreatePostBody, ICreatePostBody } from '../../../src/modules/post/dto/request/createPostBody';

@Injectable()
export class CreatePostFactory {
  create(overrides: Partial<ICreatePostBody> = {}): CreatePostBody {
    const data = {
      title: overrides.title || this.generateTitle(),
      content: overrides.content || this.generateContent(),
    };
    return plainToInstance(CreatePostBody, data);
  }

  createMany(count: number, overrides: Partial<ICreatePostBody> = {}): CreatePostBody[] {
    return Array.from({ length: count }, () => this.create(overrides));
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
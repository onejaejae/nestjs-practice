import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { UpdatePostBody, IUpdatePostBody } from '../../../src/modules/post/dto/request/updatePost.body';

@Injectable()
export class UpdatePostFactory {
  create(overrides: Partial<IUpdatePostBody> = {}): UpdatePostBody {
    const data = {
      title: overrides.title || this.generateUpdatedTitle(),
      content: overrides.content || this.generateUpdatedContent(),
    };
    return plainToInstance(UpdatePostBody, data);
  }

  createMany(count: number, overrides: Partial<IUpdatePostBody> = {}): UpdatePostBody[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  private generateUpdatedTitle(): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 5);
    return `Updated Post Title ${timestamp}-${randomStr}`;
  }

  private generateUpdatedContent(): string {
    const timestamp = Date.now();
    return `This is updated post content generated at ${timestamp}. Updated Lorem ipsum dolor sit amet.`;
  }
}
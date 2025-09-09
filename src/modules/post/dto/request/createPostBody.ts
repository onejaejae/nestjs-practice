import { plainToInstance } from 'class-transformer';
import { IsString } from 'class-validator';
import { IsNullable } from 'src/core/decorator/isNullable.decorator';
import { Post } from 'src/entities/post/post.entity';
import { User } from 'src/entities/user/user.entity';

export class CreatePostBody {
  @IsString()
  title: string;

  @IsNullable()
  @IsString()
  content: string | null;

  toEntity(userId: User['id']): Post {
    return plainToInstance(Post, {
      ...this,
      userId,
    });
  }
}

import { plainToInstance } from 'class-transformer';
import { IsString } from 'class-validator';
import { IsNullable } from 'src/core/decorator/isNullable.decorator';
import { Post } from 'src/entities/post/post.entity';
import { User } from 'src/entities/user/user.entity';

export interface ICreatePostBody {
  title: Post['title'];
  content: Post['content'];
}

export class CreatePostBody implements ICreatePostBody {
  @IsString()
  title: Post['title'];

  @IsNullable()
  @IsString()
  content: Post['content'];

  toEntity(userId: User['id']): Post {
    return plainToInstance(Post, {
      ...this,
      userId,
    });
  }
}

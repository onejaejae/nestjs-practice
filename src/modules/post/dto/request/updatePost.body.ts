import { IsString } from 'class-validator';
import { IsNullable } from 'src/core/decorator/isNullable.decorator';
import { Post } from 'src/entities/post/post.entity';

export interface IUpdatePostBody {
  title: Post['title'];
  content: Post['content'];
}

export class UpdatePostBody implements IUpdatePostBody {
  @IsString()
  title: Post['title'];

  @IsNullable()
  @IsString()
  content: Post['content'];
}
import { IsString } from 'class-validator';
import { IsNullable } from 'src/core/decorator/isNullable.decorator';

export class UpdatePostBody {
  @IsString()
  title: string;

  @IsNullable()
  @IsString()
  content: string | null;
}
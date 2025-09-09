import { IsString } from 'class-validator';
import { User } from 'src/entities/user/user.entity';

export class UpdateUserBody {
  @IsString()
  nickname: User['nickname'];
}
import { IsString } from 'class-validator';
import { User } from 'src/entities/user/user.entity';

export class SignInBody {
  @IsString()
  email: User['email'];

  @IsString()
  password: User['password'];
}

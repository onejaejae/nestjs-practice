import { IsString } from 'class-validator';
import { User } from 'src/entities/user/user.entity';

export interface ISignInBody {
  email: User['email'];
  password: User['password'];
}

export class SignInBody implements ISignInBody {
  @IsString()
  email: User['email'];

  @IsString()
  password: User['password'];
}

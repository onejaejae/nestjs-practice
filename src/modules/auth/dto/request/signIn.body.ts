import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { User } from 'src/entities/user/user.entity';

export interface ISignInBody {
  email: User['email'];
  password: User['password'];
}

export class SignInBody implements ISignInBody {
  @ApiProperty({ description: 'User email', example: 'test@example.com' })
  @IsString()
  email: User['email'];

  @ApiProperty({ description: 'User password', example: 'password123' })
  @IsString()
  password: User['password'];
}

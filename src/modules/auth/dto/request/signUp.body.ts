import { ApiProperty } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { IsString } from 'class-validator';
import { User } from 'src/entities/user/user.entity';

export interface ISignUpBody {
  email: User['email'];
  password: User['password'];
  nickname: User['nickname'];
}

export class SignUpBody implements ISignUpBody {
  @ApiProperty({ description: 'User email', example: 'test@example.com' })
  @IsString()
  email: User['email'];

  @ApiProperty({ description: 'User password', example: 'password123' })
  @IsString()
  password: User['password'];

  @ApiProperty({ description: 'User nickname', example: 'tester' })
  @IsString()
  nickname: User['nickname'];

  toEntity(hashedPassword: User['password']): User {
    return plainToInstance(User, {
      ...this,
      password: hashedPassword,
    });
  }
}

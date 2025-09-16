import { Module, Provider } from '@nestjs/common';
import { SignUpFactory } from './auth/signUp.factory';
import { SignInFactory } from './auth/signIn.factory';
import { UserFactory } from './user/user.factory';
import { UserRepositoryModule } from 'src/modules/user/repository/user-repository.module';
import { HashModule } from 'src/core/hash/hash.module';

const factories: Provider[] = [SignUpFactory, SignInFactory, UserFactory];

@Module({
  imports: [UserRepositoryModule, HashModule],
  providers: factories,
  exports: factories,
})
export class TestFactoryModule {}

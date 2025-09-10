import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserRepositoryModule } from '../user/repository/user-repository.module';
import { HashModule } from 'src/core/hash/hash.module';
import { NotificationModule } from 'src/core/notification/notification.module';

@Module({
  imports: [UserRepositoryModule, HashModule, NotificationModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}

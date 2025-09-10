import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { PostModule } from '../post/post.module';

@Module({
  imports: [PostModule],
  controllers: [AdminController],
})
export class AdminModule {}
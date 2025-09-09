import { Module } from '@nestjs/common';
import { PostRepository } from './post.repository';
import { TypeOrmExModule } from 'libs/common/typeorm.ex/typeorm-ex.module';

@Module({
  imports: [TypeOrmExModule.forCustomRepository([PostRepository])],
  exports: [TypeOrmExModule.forCustomRepository([PostRepository])],
})
export class PostRepositoryModule {}

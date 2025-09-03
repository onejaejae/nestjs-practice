import { Module } from '@nestjs/common';
import { CategoryRepositoryModule } from './repository/category-repository.module';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

@Module({
  imports: [CategoryRepositoryModule],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}
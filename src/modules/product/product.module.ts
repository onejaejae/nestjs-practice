import { Module } from '@nestjs/common';
import { ProductRepositoryModule } from './repository/product-repository.module';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

@Module({
  imports: [ProductRepositoryModule],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
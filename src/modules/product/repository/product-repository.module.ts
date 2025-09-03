import { Module } from '@nestjs/common';
import { TypeOrmExModule } from 'libs/common/typeorm.ex/typeorm-ex.module';
import { ProductRepository } from './product.repository';

@Module({
  imports: [TypeOrmExModule.forCustomRepository([ProductRepository])],
  exports: [TypeOrmExModule.forCustomRepository([ProductRepository])],
})
export class ProductRepositoryModule {}
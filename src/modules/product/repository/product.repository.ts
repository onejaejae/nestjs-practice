import { CustomRepository } from 'libs/common/typeorm.ex/typeorm-ex.decorator';
import { GenericTypeOrmRepository } from 'src/core/database/typeorm/generic-typeorm.repository';
import { Product } from 'src/entities/product/product.entity';
import {
  FindOptionsWhere,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
} from 'typeorm';
import { GetProductsQuery } from '../dto/request/getProducts.query';
import { PaginationResponse } from 'src/common/pagination/pagination.response';
import { OmitUppercaseProps } from 'src/core/database/typeorm/typeorm.interface';

@CustomRepository(Product)
export class ProductRepository extends GenericTypeOrmRepository<Product> {
  async findProductsWithFilters(
    query: GetProductsQuery,
  ): Promise<PaginationResponse<OmitUppercaseProps<Product>>> {
    const { categoryId, minPrice, maxPrice } = query;

    const where: FindOptionsWhere<Product> = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (minPrice && maxPrice) {
      where.price = Between(minPrice, maxPrice);
    } else if (minPrice) {
      where.price = MoreThanOrEqual(minPrice);
    } else if (maxPrice) {
      where.price = LessThanOrEqual(maxPrice);
    }

    return this.paginate(query, where);
  }
}

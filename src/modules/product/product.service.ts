import { Injectable } from '@nestjs/common';
import { ProductRepository } from './repository/product.repository';
import { CreateProductBody } from './dto/request/createProduct.body';
import { UpdateProductBody } from './dto/request/updateProduct.body';
import { GetProductsQuery } from './dto/request/getProducts.query';
import { Product } from 'src/entities/product/product.entity';
import { OmitUppercaseProps } from 'src/core/database/typeorm/typeorm.interface';

@Injectable()
export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  async createProduct(createProductBody: CreateProductBody): Promise<Product> {
    const product = createProductBody.toEntity();
    return await this.productRepository.save(product);
  }

  async getProducts(query: GetProductsQuery) {
    return await this.productRepository.findProductsWithFilters(query);
  }

  async getProductById(
    id: Product['id'],
  ): Promise<OmitUppercaseProps<Product>> {
    return await this.productRepository.findByIdOrThrow(id);
  }

  async updateProduct(
    id: Product['id'],
    updateProductBody: UpdateProductBody,
  ): Promise<Product> {
    const existingProduct = await this.productRepository.findOneByOrFail({
      id,
    });
    const updateData = updateProductBody.toEntity();

    const mergedProduct = this.productRepository.merge(
      existingProduct,
      updateData,
    );
    return await this.productRepository.save(mergedProduct);
  }

  async deleteProduct(id: Product['id']): Promise<void> {
    await this.productRepository.deleteById(id);
  }
}

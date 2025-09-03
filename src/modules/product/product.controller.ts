import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductBody } from './dto/request/createProduct.body';
import { UpdateProductBody } from './dto/request/updateProduct.body';
import { GetProductsQuery } from './dto/request/getProducts.query';
import { Product } from 'src/entities/product/product.entity';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  async createProduct(@Body() body: CreateProductBody) {
    return this.productService.createProduct(body);
  }

  @Get()
  async getProducts(@Query() query: GetProductsQuery) {
    return this.productService.getProducts(query);
  }

  @Get('/:id')
  async getProductById(@Param('id', ParseUUIDPipe) id: Product['id']) {
    return this.productService.getProductById(id);
  }

  @Patch('/:id')
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: Product['id'],
    @Body() body: UpdateProductBody,
  ) {
    return this.productService.updateProduct(id, body);
  }

  @Delete('/:id')
  async deleteProduct(@Param('id', ParseUUIDPipe) id: Product['id']) {
    await this.productService.deleteProduct(id);
  }
}
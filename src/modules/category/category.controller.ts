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
import { CategoryService } from './category.service';
import { CreateCategoryBody } from './dto/request/createCategory.body';
import { UpdateCategoryBody } from './dto/request/updateCategory.body';
import { GetCategoriesQuery } from './dto/request/getCategories.query';
import { Category } from 'src/entities/category/category.entity';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  async createCategory(@Body() body: CreateCategoryBody) {
    return this.categoryService.createCategory(body);
  }

  @Get()
  async getCategories(@Query() query: GetCategoriesQuery) {
    return this.categoryService.getCategories(query);
  }

  @Get('/:id')
  async getCategoryById(@Param('id', ParseUUIDPipe) id: Category['id']) {
    return this.categoryService.getCategoryById(id);
  }

  @Patch('/:id')
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: Category['id'],
    @Body() body: UpdateCategoryBody,
  ) {
    return this.categoryService.updateCategory(id, body);
  }

  @Delete('/:id')
  async deleteCategory(@Param('id', ParseUUIDPipe) id: Category['id']) {
    await this.categoryService.deleteCategory(id);
  }
}
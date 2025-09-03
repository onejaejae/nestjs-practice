import { Injectable } from '@nestjs/common';
import { CategoryRepository } from './repository/category.repository';
import { CreateCategoryBody } from './dto/request/createCategory.body';
import { UpdateCategoryBody } from './dto/request/updateCategory.body';
import { GetCategoriesQuery } from './dto/request/getCategories.query';
import { Category } from 'src/entities/category/category.entity';
import { OmitUppercaseProps } from 'src/core/database/typeorm/typeorm.interface';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async createCategory(
    createCategoryBody: CreateCategoryBody,
  ): Promise<Category> {
    const category = createCategoryBody.toEntity();
    return this.categoryRepository.save(category);
  }

  async getCategories(query: GetCategoriesQuery) {
    return this.categoryRepository.paginate(query);
  }

  async getCategoryById(
    id: Category['id'],
  ): Promise<OmitUppercaseProps<Category>> {
    return this.categoryRepository.findByIdOrThrow(id);
  }

  async updateCategory(
    id: Category['id'],
    updateCategoryBody: UpdateCategoryBody,
  ): Promise<Category> {
    const existingCategory = await this.categoryRepository.findOneByOrFail({
      id,
    });
    const updateData = updateCategoryBody.toEntity();

    const mergedCategory = this.categoryRepository.merge(
      existingCategory,
      updateData,
    );
    return await this.categoryRepository.save(mergedCategory);
  }

  async deleteCategory(id: Category['id']): Promise<void> {
    await this.categoryRepository.deleteById(id);
  }
}

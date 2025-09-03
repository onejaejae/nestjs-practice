import { IsString, MaxLength } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Category } from 'src/entities/category/category.entity';
import { IsNullable } from 'src/core/decorator/isNullable.decorator';

export class CreateCategoryBody {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsNullable()
  @IsString()
  description: string | null;

  toEntity(): Category {
    return plainToInstance(Category, {
      name: this.name,
      description: this.description,
    });
  }
}
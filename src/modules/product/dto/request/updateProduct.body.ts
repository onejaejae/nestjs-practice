import { IsString, IsNumber, IsUUID, MaxLength, Min, IsBoolean } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Product } from 'src/entities/product/product.entity';
import { IsNullable } from 'src/core/decorator/isNullable.decorator';

export class UpdateProductBody {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsNullable()
  @IsString()
  description: string | null;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  stock: number;

  @IsUUID()
  categoryId: string;

  @IsBoolean()
  isActive: boolean;

  toEntity(): Partial<Product> {
    return plainToInstance(Product, this);
  }
}
import { IsString, IsNumber, IsUUID, MaxLength, Min } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Product } from 'src/entities/product/product.entity';
import { IsNullable } from 'src/core/decorator/isNullable.decorator';

export class CreateProductBody {
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

  toEntity(): Product {
    return plainToInstance(Product, this);
  }
}
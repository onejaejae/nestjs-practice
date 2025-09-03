import { Entity, Column, OneToMany } from 'typeorm';
import { UuidEntity } from 'src/core/database/typeorm/base.entity';
import { Product } from 'src/entities/product/product.entity';

@Entity('category')
export class Category extends UuidEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @OneToMany(() => Product, (product) => product.Category)
  Products: Product[];
}
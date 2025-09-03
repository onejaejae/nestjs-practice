import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { UuidEntity } from 'src/core/database/typeorm/base.entity';
import { Category } from 'src/entities/category/category.entity';

@Entity('product')
export class Product extends UuidEntity {
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', unsigned: true })
  price: number;

  @Column({ type: 'int', unsigned: true, default: 0 })
  stock: number;

  @Column({ type: 'uuid' })
  categoryId: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  Category: Category;
}
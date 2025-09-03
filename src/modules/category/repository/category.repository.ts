import { CustomRepository } from 'libs/common/typeorm.ex/typeorm-ex.decorator';
import { GenericTypeOrmRepository } from 'src/core/database/typeorm/generic-typeorm.repository';
import { Category } from 'src/entities/category/category.entity';

@CustomRepository(Category)
export class CategoryRepository extends GenericTypeOrmRepository<Category> {}
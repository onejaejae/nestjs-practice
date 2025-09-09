import { CustomRepository } from 'libs/common/typeorm.ex/typeorm-ex.decorator';
import { GenericTypeOrmRepository } from 'src/core/database/typeorm/generic-typeorm.repository';
import { Post } from 'src/entities/post/post.entity';

@CustomRepository(Post)
export class PostRepository extends GenericTypeOrmRepository<Post> {}

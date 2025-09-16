import { Module, Provider } from '@nestjs/common';
import { SignUpFactory } from './auth/signUp.factory';
import { SignInFactory } from './auth/signIn.factory';
import { UserFactory } from './user/user.factory';
import { PostFactory } from './post/post.factory';
import { CreatePostFactory } from './post/createPost.factory';
import { UpdatePostFactory } from './post/updatePost.factory';
import { GetPostsFactory } from './post/getPosts.factory';
import { UserRepositoryModule } from 'src/modules/user/repository/user-repository.module';
import { HashModule } from 'src/core/hash/hash.module';
import { PostRepositoryModule } from 'src/modules/post/repository/post-repository.module';

const factories: Provider[] = [
  SignUpFactory, 
  SignInFactory, 
  UserFactory, 
  PostFactory,
  CreatePostFactory,
  UpdatePostFactory,
  GetPostsFactory,
];

@Module({
  imports: [UserRepositoryModule, PostRepositoryModule, HashModule],
  providers: factories,
  exports: factories,
})
export class TestFactoryModule {}

import { Injectable, ForbiddenException } from '@nestjs/common';
import { CreatePostBody } from './dto/request/createPostBody';
import { UpdatePostBody } from './dto/request/updatePost.body';
import { GetPostsQuery } from './dto/request/getPosts.query';
import { PostRepository } from './repository/post.repository';
import { User } from 'src/entities/user/user.entity';
import { Post } from 'src/entities/post/post.entity';

@Injectable()
export class PostService {
  constructor(private readonly postRepository: PostRepository) {}

  async getPosts(query: GetPostsQuery) {
    return this.postRepository.paginate(query);
  }

  async getPost(postId: Post['id']) {
    return this.postRepository.findOneWithOmitNotJoinedPropsOrThrow(
      { id: postId },
      { User: true },
    );
  }

  async createPost(userId: User['id'], body: CreatePostBody) {
    const post = body.toEntity(userId);
    return this.postRepository.save(post);
  }

  async updatePost(
    userId: User['id'],
    postId: Post['id'],
    body: UpdatePostBody,
  ) {
    const post = await this.postRepository.findByIdOrThrow(postId);

    if (post.userId !== userId)
      throw new ForbiddenException('You can only update your own posts');

    post.title = body.title;
    post.content = body.content;

    return this.postRepository.save(post);
  }

  async deletePost(userId: User['id'], postId: Post['id']) {
    const post = await this.postRepository.findByIdOrThrow(postId);

    if (post.userId !== userId)
      throw new ForbiddenException('You can only delete your own posts');

    await this.postRepository.softRemove(post);
  }
}

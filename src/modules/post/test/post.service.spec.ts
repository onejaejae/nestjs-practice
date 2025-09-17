import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, MockProxy } from 'jest-mock-extended';
import { PostService } from '../post.service';
import { PostRepository } from '../repository/post.repository';
import { ForbiddenException } from '@nestjs/common';
import { Post } from 'src/entities/post/post.entity';
import { CreatePostBody } from '../dto/request/createPostBody';
import { plainToInstance } from 'class-transformer';
import { UpdatePostBody } from '../dto/request/updatePost.body';
import { GetPostsQuery } from '../dto/request/getPosts.query';

describe('PostService', () => {
  let service: PostService;
  let postRepository: MockProxy<PostRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostService],
    })
      .useMocker(() => mockDeep<any>())
      .compile();

    service = module.get<PostService>(PostService);
    postRepository = module.get(PostRepository);
  });

  describe('getPosts', () => {
    it('should call repository.paginate with the given query', async () => {
      const query = plainToInstance(GetPostsQuery, {});
      await service.getPosts(query);
      expect(postRepository.paginate).toHaveBeenCalledWith(query);
    });
  });

  describe('getPost', () => {
    it('should call repository.findOneWithOmitNotJoinedPropsOrThrow with correct arguments', async () => {
      const postId = 'post-id';
      await service.getPost(postId);
      expect(
        postRepository.findOneWithOmitNotJoinedPropsOrThrow,
      ).toHaveBeenCalledWith({ id: postId }, { User: true });
    });
  });

  describe('createPost', () => {
    it('should create and save a new post', async () => {
      const userId = 'user-id';
      const createDto = plainToInstance(CreatePostBody, {
        title: 'New Post',
        content: 'This is content.',
      });
      const postEntity = { id: 'new-post-id' } as Post;
      jest.spyOn(createDto, 'toEntity').mockReturnValue(postEntity);

      await service.createPost(userId, createDto);

      expect(createDto.toEntity).toHaveBeenCalledWith(userId);
      expect(postRepository.save).toHaveBeenCalledWith(postEntity);
    });
  });

  describe('updatePost', () => {
    const userId = 'user-id';
    const postId = 'post-id';
    const updateDto = plainToInstance(UpdatePostBody, {
      title: 'Updated Title',
      content: 'Updated content.',
    });

    it('should update the post if the user is the owner', async () => {
      const post = { id: postId, userId, title: 'Old Title' } as Post;
      postRepository.findByIdOrThrow.mockResolvedValue(post);

      await service.updatePost(userId, postId, updateDto);

      expect(postRepository.findByIdOrThrow).toHaveBeenCalledWith(postId);
      expect(postRepository.save).toHaveBeenCalledWith(post);
    });

    it('should throw ForbiddenException if the user is not the owner', async () => {
      const otherUserId = 'other-user-id';
      const post = { id: postId, userId: otherUserId } as Post;
      postRepository.findByIdOrThrow.mockResolvedValue(post);

      await expect(
        service.updatePost(userId, postId, updateDto),
      ).rejects.toThrow(
        new ForbiddenException('You can only update your own posts'),
      );
      expect(postRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('deletePost', () => {
    const userId = 'user-id';
    const postId = 'post-id';

    it('should soft remove the post if the user is the owner', async () => {
      const post = { id: postId, userId } as Post;
      postRepository.findByIdOrThrow.mockResolvedValue(post);

      await service.deletePost(userId, postId);

      expect(postRepository.findByIdOrThrow).toHaveBeenCalledWith(postId);
      expect(postRepository.softRemove).toHaveBeenCalledWith(post);
    });

    it('should throw ForbiddenException if the user is not the owner', async () => {
      const otherUserId = 'other-user-id';
      const post = { id: postId, userId: otherUserId } as Post;
      postRepository.findByIdOrThrow.mockResolvedValue(post);

      await expect(service.deletePost(userId, postId)).rejects.toThrow(
        new ForbiddenException('You can only delete your own posts'),
      );
      expect(postRepository.softRemove).not.toHaveBeenCalled();
    });
  });

  describe('adminDeletePost', () => {
    it('should call repository.deleteById with the given id', async () => {
      const postId = 'post-id';
      await service.adminDeletePost(postId);
      expect(postRepository.deleteById).toHaveBeenCalledWith(postId);
    });
  });
});

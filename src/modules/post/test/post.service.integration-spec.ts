import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { DataSource } from 'typeorm';

import { PostService } from '../post.service';
import { PostModule } from '../post.module';
import { PostRepository } from '../repository/post.repository';
import { CoreModule } from 'src/core/core.module';
import { TestFactoryModule } from '../../../../test/factories/factory.module';
import { UserFactory } from '../../../../test/factories/user/user.factory';
import { PostFactory } from '../../../../test/factories/post/post.factory';
import { CreatePostFactory } from '../../../../test/factories/post/createPost.factory';
import { UpdatePostFactory } from '../../../../test/factories/post/updatePost.factory';
import { GetPostsFactory } from '../../../../test/factories/post/getPosts.factory';
import { User } from 'src/entities/user/user.entity';
import { Post } from 'src/entities/post/post.entity';

describe('PostService Integration Tests', () => {
  let service: PostService;
  let module: TestingModule;
  let dataSource: DataSource;
  let postRepository: PostRepository;
  let userFactory: UserFactory;
  let postFactory: PostFactory;
  let createPostFactory: CreatePostFactory;
  let updatePostFactory: UpdatePostFactory;
  let getPostsFactory: GetPostsFactory;

  beforeAll(async () => {
    initializeTransactionalContext();

    module = await Test.createTestingModule({
      imports: [CoreModule, PostModule, TestFactoryModule],
    }).compile();

    service = module.get<PostService>(PostService);
    dataSource = module.get<DataSource>(DataSource);
    postRepository = module.get<PostRepository>(PostRepository);
    userFactory = module.get<UserFactory>(UserFactory);
    postFactory = module.get<PostFactory>(PostFactory);
    createPostFactory = module.get<CreatePostFactory>(CreatePostFactory);
    updatePostFactory = module.get<UpdatePostFactory>(UpdatePostFactory);
    getPostsFactory = module.get<GetPostsFactory>(GetPostsFactory);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await postRepository.clear();
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  });

  describe('createPost Integration', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await userFactory.create();
    });

    it('포스트가 성공적으로 생성되어야 합니다', async () => {
      // Arrange
      const createPostBody = createPostFactory.create();

      // Act
      const result = await service.createPost(testUser.id, createPostBody);

      // Assert
      expect(result).toBeTruthy();
      expect(result.title).toBe(createPostBody.title);
      expect(result.content).toBe(createPostBody.content);
      expect(result.userId).toBe(testUser.id);
      expect(result.id).toBeDefined();

      // 데이터베이스에서 확인
      const savedPost = await postRepository.findByIdOrThrow(result.id);
      expect(savedPost.title).toBe(createPostBody.title);
      expect(savedPost.userId).toBe(testUser.id);
    });
  });

  describe('getPosts Integration', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await userFactory.create();
      // 테스트용 포스트 3개 생성
      await postFactory.createMany(3, testUser.id);
    });

    it('포스트 목록을 페이징으로 조회할 수 있어야 합니다', async () => {
      // Arrange
      const query = getPostsFactory.createWithPaging(1, 2);

      // Act
      const result = await service.getPosts(query);

      // Assert
      expect(result).toBeTruthy();
      expect(Array.isArray(result.list)).toBe(true);
      expect(result.list.length).toBe(2);
      expect(result.total).toBe(3);
      expect(result.hasNext).toBeTruthy();
    });

    it('기본 쿼리로 포스트 목록을 조회할 수 있어야 합니다', async () => {
      // Arrange
      const query = getPostsFactory.createDefault();

      // Act
      const result = await service.getPosts(query);

      // Assert
      expect(result).toBeTruthy();
      expect(Array.isArray(result.list)).toBe(true);
      expect(result.list.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('getPost Integration', () => {
    let testUser: User;
    let testPost: Post;

    beforeEach(async () => {
      testUser = await userFactory.create();
      testPost = await postFactory.createForUser(testUser);
    });

    it('포스트 상세 정보를 조회할 수 있어야 합니다', async () => {
      // Act
      const result = await service.getPost(testPost.id);

      // Assert
      expect(result).toBeTruthy();
      expect(result.id).toBe(testPost.id);
      expect(result.title).toBe(testPost.title);
      expect(result.content).toBe(testPost.content);
      expect(result.User).toBeDefined();
      expect(result.User.id).toBe(testUser.id);
    });

    it('존재하지 않는 포스트 조회 시 에러가 발생해야 합니다', async () => {
      // Arrange
      const nonExistentPostId = 'non-existent-id';

      // Act & Assert
      await expect(service.getPost(nonExistentPostId)).rejects.toThrow(
        new NotFoundException('Not found'),
      );
    });
  });

  describe('updatePost Integration', () => {
    let postOwner: User;
    let otherUser: User;
    let testPost: Post;

    beforeEach(async () => {
      postOwner = await userFactory.create();
      otherUser = await userFactory.create();
      testPost = await postFactory.createForUser(postOwner);
    });

    it('포스트 작성자가 포스트를 수정할 수 있어야 합니다', async () => {
      // Arrange
      const updatePostBody = updatePostFactory.create();
      const title = updatePostBody.title;
      const content = updatePostBody.content;

      // Act
      const result = await service.updatePost(
        postOwner.id,
        testPost.id,
        updatePostBody,
      );

      // Assert
      expect(result).toBeTruthy();
      expect(result.title).toBe(title);
      expect(result.content).toBe(content);
      expect(result.userId).toBe(postOwner.id);

      // 데이터베이스에서 확인
      const updatedPost = await postRepository.findByIdOrThrow(testPost.id);
      expect(updatedPost.title).toBe(title);
      expect(updatedPost.content).toBe(content);
    });

    it('다른 사용자가 포스트를 수정하려 할 때 ForbiddenException이 발생해야 합니다', async () => {
      // Arrange
      const updatePostBody = updatePostFactory.create();

      // Act & Assert
      await expect(
        service.updatePost(otherUser.id, testPost.id, updatePostBody),
      ).rejects.toThrow(
        new ForbiddenException('You can only update your own posts'),
      );

      // 원본 데이터가 변경되지 않았는지 확인
      const originalPost = await postRepository.findByIdOrThrow(testPost.id);
      expect(originalPost.title).toBe(testPost.title);
      expect(originalPost.content).toBe(testPost.content);
    });

    it('존재하지 않는 포스트 수정 시 에러가 발생해야 합니다', async () => {
      // Arrange
      const nonExistentPostId = 'non-existent-id';
      const updatePostBody = updatePostFactory.create();

      // Act & Assert
      await expect(
        service.updatePost(postOwner.id, nonExistentPostId, updatePostBody),
      ).rejects.toThrow(
        new NotFoundException(`don't exist ${nonExistentPostId}`),
      );
    });
  });

  describe('deletePost Integration', () => {
    let postOwner: User;
    let otherUser: User;
    let testPost: Post;

    beforeEach(async () => {
      postOwner = await userFactory.create();
      otherUser = await userFactory.create();
      testPost = await postFactory.createForUser(postOwner);
    });

    it('포스트 작성자가 포스트를 삭제할 수 있어야 합니다', async () => {
      // Act
      await service.deletePost(postOwner.id, testPost.id);

      // Assert - soft delete이므로 deletedAt이 설정되어야 함
      const deletedPost = await postRepository.findOne({
        where: { id: testPost.id },
        withDeleted: true,
      });
      expect(deletedPost).toBeTruthy();
      expect(deletedPost?.deletedAt).toBeTruthy();

      // 일반 조회에서는 찾을 수 없어야 함
      const activePost = await postRepository.findOne({
        where: { id: testPost.id },
      });
      expect(activePost).toBeNull();
    });

    it('다른 사용자가 포스트를 삭제하려 할 때 ForbiddenException이 발생해야 합니다', async () => {
      // Act & Assert
      await expect(
        service.deletePost(otherUser.id, testPost.id),
      ).rejects.toThrow(
        new ForbiddenException('You can only delete your own posts'),
      );

      // 포스트가 삭제되지 않았는지 확인
      const stillExistsPost = await postRepository.findByIdOrThrow(testPost.id);
      expect(stillExistsPost).toBeTruthy();
      expect(stillExistsPost.deletedAt).toBeNull();
    });

    it('존재하지 않는 포스트 삭제 시 에러가 발생해야 합니다', async () => {
      // Arrange
      const nonExistentPostId = 'non-existent-id';

      // Act & Assert
      await expect(
        service.deletePost(postOwner.id, nonExistentPostId),
      ).rejects.toThrow(
        new NotFoundException(`don't exist ${nonExistentPostId}`),
      );
    });
  });

  describe('adminDeletePost Integration', () => {
    let testUser: User;
    let testPost: Post;

    beforeEach(async () => {
      testUser = await userFactory.create();
      testPost = await postFactory.createForUser(testUser);
    });

    it('관리자가 포스트를 완전 삭제할 수 있어야 합니다', async () => {
      // Act
      await service.adminDeletePost(testPost.id);

      // Assert - 완전 삭제되어야 함
      const deletedPost = await postRepository.findOne({
        where: { id: testPost.id },
        withDeleted: true,
      });
      expect(deletedPost).toBeNull();
    });

    it('존재하지 않는 포스트를 관리자가 삭제하려 할 때 에러가 발생해야 합니다', async () => {
      // Arrange
      const nonExistentPostId = 'non-existent-id';

      // Act & Assert
      await expect(
        service.adminDeletePost(nonExistentPostId),
      ).rejects.toThrow();
    });
  });

  describe('Complete Post Lifecycle Integration', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await userFactory.create();
    });

    it('포스트 생성부터 수정, 삭제까지 전체 플로우가 동작해야 합니다', async () => {
      // 1. 포스트 생성
      const createPostBody = createPostFactory.create();
      const mockTitle = createPostBody.title;

      const createdPost = await service.createPost(testUser.id, createPostBody);
      expect(createdPost.title).toBe(mockTitle);

      // 2. 포스트 조회
      const retrievedPost = await service.getPost(createdPost.id);
      expect(retrievedPost.title).toBe(mockTitle);
      expect(retrievedPost.User.id).toBe(testUser.id);

      // 3. 포스트 수정
      const updatePostBody = updatePostFactory.create();
      const mockUpdateTitle = updatePostBody.title;

      const updatedPost = await service.updatePost(
        testUser.id,
        createdPost.id,
        updatePostBody,
      );
      expect(updatedPost.title).toBe(mockUpdateTitle);

      // 4. 포스트 목록에서 확인
      const postsList = await service.getPosts(getPostsFactory.createDefault());
      const foundPost = postsList.list.find(
        (post) => post.id === createdPost.id,
      );
      expect(foundPost?.title).toBe(mockUpdateTitle);

      // 5. 포스트 삭제
      await service.deletePost(testUser.id, createdPost.id);

      // 6. 삭제된 포스트는 일반 조회에서 찾을 수 없어야 함
      const deletedPost = await postRepository.findOne({
        where: { id: createdPost.id },
      });
      expect(deletedPost).toBeNull();
    });
  });
});

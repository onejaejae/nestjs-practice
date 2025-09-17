import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CoreModule } from '../../src/core/core.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { PostModule } from '../../src/modules/post/post.module';
import { TestFactoryModule } from '../factories/factory.module';
import { setNestApp } from '../../src/setNestApp';
import { UserFactory } from '../factories/user/user.factory';
import { PostFactory } from '../factories/post/post.factory';
import { CreatePostFactory } from '../factories/post/createPost.factory';
import { UpdatePostFactory } from '../factories/post/updatePost.factory';
import { JwtService } from '../../src/core/jwt/jwt.service';
import { User } from '../../src/entities/user/user.entity';
import { Post } from '../../src/entities/post/post.entity';
import { TestRequester } from '../utils/test-requester';
import { PaginationResponse } from '../../src/common/pagination/pagination.response';

describe('Post E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userFactory: UserFactory;
  let postFactory: PostFactory;
  let createPostFactory: CreatePostFactory;
  let updatePostFactory: UpdatePostFactory;
  let jwtService: JwtService;

  let user: User;
  let authedRequester: TestRequester;
  let publicRequester: TestRequester;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CoreModule, AuthModule, PostModule, TestFactoryModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setNestApp(app);
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    userFactory = moduleFixture.get<UserFactory>(UserFactory);
    postFactory = moduleFixture.get<PostFactory>(PostFactory);
    createPostFactory = moduleFixture.get<CreatePostFactory>(CreatePostFactory);
    updatePostFactory = moduleFixture.get<UpdatePostFactory>(UpdatePostFactory);
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await dataSource.query('TRUNCATE TABLE user');
    await dataSource.query('TRUNCATE TABLE post');
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');

    user = await userFactory.create();
    const { accessToken } = await jwtService.generateTokenPair(user.id);

    authedRequester = new TestRequester(app, accessToken);
    publicRequester = new TestRequester(app);
  });

  describe('/posts (POST)', () => {
    it('성공적으로 게시글을 생성해야 한다', async () => {
      const createPostBody = createPostFactory.create();

      const { data, success } = await authedRequester
        .post<Post>('/posts')
        .send(createPostBody)
        .expect(201);

      expect(success).toBe(true);
      expect(data.title).toBe(createPostBody.title);
    });

    it('인증 없이 게시글을 생성 시 401 에러가 발생해야 한다', async () => {
      const createPostBody = createPostFactory.create();
      await publicRequester.post('/posts').send(createPostBody).expect(401);
    });
  });

  describe('/posts (GET)', () => {
    it('성공적으로 게시글 목록을 조회해야 한다', async () => {
      await postFactory.createMany(3, user.id);

      const { data } = await publicRequester
        .get<PaginationResponse<Post>>('/posts')
        .expect(200);

      expect(data.list).toHaveLength(3);
      expect(data.total).toBe(3);
    });
  });

  describe('/posts/:id (GET)', () => {
    let post: Post;

    beforeEach(async () => {
      post = await postFactory.create(user.id);
    });

    it('성공적으로 특정 게시글을 조회해야 한다', async () => {
      const { data } = await publicRequester
        .get<Post>(`/posts/${post.id}`)
        .expect(200);

      expect(data.id).toBe(post.id);
      expect(data.title).toBe(post.title);
    });

    it('존재하지 않는 게시글 조회 시 404 에러가 발생해야 한다', async () => {
      const nonExistentId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
      await publicRequester.get(`/posts/${nonExistentId}`).expect(404);
    });
  });

  describe('/posts/:id (PATCH)', () => {
    let post: Post;

    beforeEach(async () => {
      post = await postFactory.create(user.id);
    });

    it('성공적으로 게시글을 수정해야 한다', async () => {
      const updatePostBody = updatePostFactory.create();

      const { success, data } = await authedRequester
        .patch<Post>(`/posts/${post.id}`)
        .send(updatePostBody)
        .expect(200);

      expect(success).toBe(true);
      expect(data.title).toBe(updatePostBody.title);
    });

    it('다른 사용자의 게시글을 수정 시 403 에러가 발생해야 한다', async () => {
      const anotherUser = await userFactory.create();
      const { accessToken } = await jwtService.generateTokenPair(
        anotherUser.id,
      );
      const anotherUserRequester = new TestRequester(app, accessToken);
      const updatePostBody = updatePostFactory.create();

      await anotherUserRequester
        .patch(`/posts/${post.id}`)
        .send(updatePostBody)
        .expect(403);
    });
  });

  describe('/posts/:id (DELETE)', () => {
    let post: Post;

    beforeEach(async () => {
      post = await postFactory.create(user.id);
    });

    it('성공적으로 게시글을 삭제해야 한다', async () => {
      const { success } = await authedRequester
        .delete<null>(`/posts/${post.id}`)
        .expect(200);

      expect(success).toBe(true);
    });

    it('다른 사용자의 게시글을 삭제 시 403 에러가 발생해야 한다', async () => {
      const anotherUser = await userFactory.create();
      const { accessToken } = await jwtService.generateTokenPair(
        anotherUser.id,
      );
      const anotherUserRequester = new TestRequester(app, accessToken);

      await anotherUserRequester.delete(`/posts/${post.id}`).expect(403);
    });
  });
});

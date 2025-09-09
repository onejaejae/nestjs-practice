import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PostService } from './post.service';
import { CreatePostBody } from './dto/request/createPostBody';
import { UpdatePostBody } from './dto/request/updatePost.body';
import { GetPostsQuery } from './dto/request/getPosts.query';
import { CurrentUser } from 'src/core/decorator/currentUser.decorator';
import { User } from 'src/entities/user/user.entity';
import { Public } from 'src/core/decorator/public.decorator';
import { Post as PostEntity } from 'src/entities/post/post.entity';

@Controller('posts')
export class PostController {
  constructor(private readonly service: PostService) {}

  @Public()
  @Get()
  async getPosts(@Query() query: GetPostsQuery) {
    return this.service.getPosts(query);
  }

  @Public()
  @Get('/:id')
  async getPost(@Param('id', ParseUUIDPipe) postId: PostEntity['id']) {
    return this.service.getPost(postId);
  }

  @Post()
  async createPost(@CurrentUser() user: User, @Body() body: CreatePostBody) {
    return this.service.createPost(user.id, body);
  }

  @Patch('/:id')
  async updatePost(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) postId: PostEntity['id'],
    @Body() body: UpdatePostBody,
  ) {
    return this.service.updatePost(user.id, postId, body);
  }

  @Delete('/:id')
  async deletePost(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) postId: PostEntity['id'],
  ) {
    return this.service.deletePost(user.id, postId);
  }
}

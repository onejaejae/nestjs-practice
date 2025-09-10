import {
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { PostService } from '../post/post.service';
import { Roles } from 'src/core/decorator/roles.decorator';
import { RolesGuard } from 'src/core/guard/roles.guard';
import { Role } from 'src/entities/user/user.interface';
import { Post } from 'src/entities/post/post.entity';

@Controller('admin')
@UseGuards(RolesGuard)
export class AdminController {
  constructor(private readonly postService: PostService) {}

  @Delete('/posts/:id')
  @Roles(Role.ADMIN)
  async deletePost(@Param('id', ParseUUIDPipe) postId: Post['id']) {
    return this.postService.adminDeletePost(postId);
  }
}
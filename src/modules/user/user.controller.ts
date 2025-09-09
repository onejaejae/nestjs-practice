import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { User } from 'src/entities/user/user.entity';
import { UserService } from './user.service';
import { UpdateUserScoreDto } from './dto/request/updateUserScore.dto';
import { GetUsersByRankDto } from './dto/request/getUsersByRank.dto';
import { UpdateUserBody } from './dto/request/updateUser.body';
import { CurrentUser } from 'src/core/decorator/currentUser.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly service: UserService) {}

  @Get('/rank')
  async getUsersByRank(@Query() query: GetUsersByRankDto) {
    return this.service.getUsersByRank(query);
  }

  @Get('/:userId/rank')
  async getUserRank(@Param('userId', ParseUUIDPipe) userId: User['id']) {
    return this.service.getUserRank(userId);
  }

  @Get('/me')
  async getMe(@CurrentUser() user: User) {
    return this.service.getUser(user.id);
  }

  @Patch('/me')
  async updateMe(@CurrentUser() user: User, @Body() body: UpdateUserBody) {
    return this.service.updateUser(user.id, body);
  }

  @Patch('/:userId/score')
  async updateScore(
    @Param('userId', ParseUUIDPipe) userId: User['id'],
    @Body() body: UpdateUserScoreDto,
  ) {
    return this.service.updateScore(userId, body.score);
  }
}

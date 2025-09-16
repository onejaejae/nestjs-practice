import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { GetPostsQuery } from '../../../src/modules/post/dto/request/getPosts.query';
import { PaginationDefault } from 'src/common/pagination/pagination.request';

@Injectable()
export class GetPostsFactory {
  create(overrides: Partial<GetPostsQuery> = {}): GetPostsQuery {
    const data = {
      page: overrides.page || PaginationDefault.PAGE_DEFAULT,
      limit: overrides.limit || PaginationDefault.LIMIT_DEFAULT,
    };
    return plainToInstance(GetPostsQuery, data);
  }

  createWithPaging(page: number, limit: number): GetPostsQuery {
    return this.create({ page, limit });
  }

  createDefault(): GetPostsQuery {
    return plainToInstance(GetPostsQuery, {});
  }
}

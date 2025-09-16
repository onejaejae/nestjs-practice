# NestJS Swagger API 문서화 가이드

## 목차
1. [Swagger 소개와 설정](#swagger-소개와-설정)
2. [기본 API 문서화](#기본-api-문서화)
3. [인증 시스템 문서화](#인증-시스템-문서화)
4. [Request/Response 스키마 정의](#requestresponse-스키마-정의)
5. [고급 문서화 패턴](#고급-문서화-패턴)
6. [프론트엔드 협업 가이드](#프론트엔드-협업-가이드)
7. [실무 활용 팁](#실무-활용-팁)

## Swagger 소개와 설정

### 1. Swagger 패키지 설치

```bash
npm install @nestjs/swagger swagger-ui-express
npm install -D @types/swagger-ui-express
```

### 2. main.ts에서 Swagger 설정

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('NestJS Practice API')
    .setDescription('NestJS 3주차 프로젝트 API 문서')
    .setVersion('1.0')
    .addTag('auth', '인증 관련 API')
    .addTag('users', '사용자 관련 API')
    .addTag('posts', '포스트 관련 API')
    .addTag('admin', '관리자 전용 API')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth' // 이 키를 컨트롤러에서 참조
    )
    .addCookieAuth('refreshToken', {
      type: 'apiKey',
      in: 'cookie',
      name: 'refreshToken',
      description: 'Refresh token stored in httpOnly cookie'
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // 새로고침해도 토큰 유지
      tagsSorter: 'alpha',        // 태그 알파벳 순 정렬
      operationsSorter: 'alpha',  // API 엔드포인트 알파벳 순 정렬
    },
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #3b82f6; }
    `,
    customSiteTitle: 'NestJS Practice API Docs',
  });

  app.useGlobalPipes(new ValidationPipe());
  await app.listen(3000);
}
bootstrap();
```

### 3. 환경별 Swagger 설정

```typescript
// src/main.ts - 환경별 조건부 활성화
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 개발/스테이징 환경에서만 Swagger 활성화
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    const config = new DocumentBuilder()
      .setTitle('NestJS Practice API')
      .setDescription(`
        ## 📖 API 문서 활용 가이드
        
        이 문서는 NestJS Practice 프로젝트의 API 명세서입니다.
        
        ### 🔐 인증 방법
        1. \`POST /auth/sign-in\`으로 로그인
        2. 응답에서 받은 \`accessToken\`을 복사
        3. 우측 상단의 🔒 버튼 클릭 후 토큰 입력
        4. 인증이 필요한 API들을 테스트할 수 있습니다
        
        ### 📝 API 호출 순서 예시
        1. **회원가입**: \`POST /auth/sign-up\`
        2. **로그인**: \`POST /auth/sign-in\`
        3. **프로필 조회**: \`GET /users/me\`
        4. **포스트 작성**: \`POST /posts\`
        5. **포스트 목록**: \`GET /posts\`
      `)
      .setVersion('1.0')
      .setContact('개발팀', 'https://github.com/username/nestjs-practice', 'dev@example.com')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addServer('http://localhost:3000', '로컬 개발 서버')
      .addServer('https://api-staging.example.com', '스테이징 서버')
      // ... 나머지 설정
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  await app.listen(3000);
}
```

## 기본 API 문서화

### 1. Controller 레벨 문서화

현재 프로젝트의 AuthController를 Swagger로 문서화:

```typescript
// src/modules/auth/auth.controller.ts
import {
  Body, Controller, HttpCode, HttpStatus, Post,
  Request, Response, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBody,
  ApiBearerAuth, ApiCookieAuth, ApiBadRequestResponse,
  ApiUnauthorizedResponse, ApiConflictResponse,
} from '@nestjs/swagger';
import { Response as ExpressResponse } from 'express';
import { AuthService } from './auth.service';
import { SignUpBody } from './dto/request/signUp.body';
import { SignInBody } from './dto/request/signIn.body';
import { SignInResponse } from './dto/response/signIn.response';
import { CurrentUser } from 'src/core/decorator/currentUser.decorator';
import { Public } from 'src/core/decorator/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: '회원가입',
    description: `
      새로운 사용자 계정을 생성합니다.
      
      **주의사항:**
      - 이메일은 유일해야 합니다
      - 비밀번호는 최소 8자 이상이어야 합니다
      - 닉네임은 2-20자 사이여야 합니다
    `
  })
  @ApiResponse({
    status: 201,
    description: '회원가입 성공',
    type: 'object',
    example: {
      message: '회원가입이 완료되었습니다.'
    }
  })
  @ApiConflictResponse({
    description: '이미 존재하는 이메일',
    example: {
      statusCode: 409,
      message: 'User already exists',
      error: 'Conflict'
    }
  })
  @ApiBadRequestResponse({
    description: '유효하지 않은 입력 데이터',
    example: {
      statusCode: 400,
      message: [
        'email must be an email',
        'password must be longer than or equal to 8 characters',
        'nickname must be longer than or equal to 2 characters'
      ],
      error: 'Bad Request'
    }
  })
  @Public()
  @Post('sign-up')
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() body: SignUpBody) {
    await this.authService.signUp(body);
    return { message: '회원가입이 완료되었습니다.' };
  }

  @ApiOperation({
    summary: '로그인',
    description: `
      사용자 인증을 수행하고 JWT 토큰을 발급합니다.
      
      **응답 정보:**
      - accessToken: API 호출에 사용할 인증 토큰 (Header에 포함)
      - refreshToken: HttpOnly 쿠키로 자동 저장됨
      
      **토큰 유효기간:**
      - accessToken: 1시간
      - refreshToken: 7일
    `
  })
  @ApiResponse({
    status: 200,
    description: '로그인 성공',
    type: SignInResponse,
    headers: {
      'Set-Cookie': {
        description: 'HttpOnly 쿠키로 설정되는 refreshToken',
        schema: {
          type: 'string',
          example: 'refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800'
        }
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: '로그인 실패 (잘못된 이메일 또는 비밀번호)',
    example: {
      statusCode: 401,
      message: 'Invalid credentials',
      error: 'Unauthorized'
    }
  })
  @Public()
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() body: SignInBody,
    @Response({ passthrough: true }) res: ExpressResponse,
  ): Promise<SignInResponse> {
    const tokenPair = await this.authService.signIn(body);
    this.setRefreshTokenCookie(res, tokenPair.refreshToken);

    return { accessToken: tokenPair.accessToken };
  }

  @ApiOperation({
    summary: '로그아웃',
    description: `
      현재 사용자를 로그아웃시키고 토큰을 무효화합니다.
      
      **처리 내용:**
      1. 현재 accessToken을 블랙리스트에 추가
      2. 사용자의 모든 refreshToken 무효화
      3. refreshToken 쿠키 삭제
    `
  })
  @ApiResponse({
    status: 200,
    description: '로그아웃 성공',
    example: {
      message: '로그아웃이 완료되었습니다.'
    }
  })
  @ApiUnauthorizedResponse({
    description: '인증되지 않은 사용자',
  })
  @ApiBearerAuth('JWT-auth')
  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  async signOut(
    @CurrentUser() user: User,
    @Request() req: Request,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const accessToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req) ?? '';
    this.clearRefreshTokenCookie(res);
    await this.authService.signOut(user.id, accessToken);
    
    return { message: '로그아웃이 완료되었습니다.' };
  }

  @ApiOperation({
    summary: '토큰 갱신',
    description: `
      refreshToken을 사용하여 새로운 accessToken을 발급받습니다.
      
      **작동 방식:**
      1. 쿠키의 refreshToken 검증
      2. 새로운 accessToken 및 refreshToken 발급
      3. 기존 refreshToken 무효화
      4. 새 refreshToken을 쿠키에 저장
    `
  })
  @ApiResponse({
    status: 200,
    description: '토큰 갱신 성공',
    type: SignInResponse
  })
  @ApiUnauthorizedResponse({
    description: '유효하지 않은 refreshToken',
    example: {
      statusCode: 401,
      message: 'Invalid refresh token',
      error: 'Unauthorized'
    }
  })
  @ApiCookieAuth('refreshToken')
  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentRefreshToken() refreshToken: string,
    @Response({ passthrough: true }) res: ExpressResponse,
  ): Promise<SignInResponse> {
    const tokenPair = await this.authService.refreshTokens(refreshToken);
    this.setRefreshTokenCookie(res, tokenPair.refreshToken);

    return { accessToken: tokenPair.accessToken };
  }

  // private 메서드들...
}
```

### 2. DTO 클래스 문서화

```typescript
// src/modules/auth/dto/request/signUp.body.ts
import { ApiProperty } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { User } from 'src/entities/user/user.entity';

export class SignUpBody {
  @ApiProperty({
    description: '사용자 이메일 주소',
    example: 'user@example.com',
    format: 'email',
    uniqueItems: true,
  })
  @IsEmail({}, { message: '올바른 이메일 형식을 입력해주세요.' })
  email: User['email'];

  @ApiProperty({
    description: '사용자 비밀번호 (8-50자, 영문+숫자 조합)',
    example: 'password123',
    minLength: 8,
    maxLength: 50,
    pattern: '^(?=.*[a-zA-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]{8,}$',
  })
  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @MaxLength(50, { message: '비밀번호는 최대 50자까지 가능합니다.' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/, {
    message: '비밀번호는 영문과 숫자를 포함해야 합니다.',
  })
  password: User['password'];

  @ApiProperty({
    description: '사용자 닉네임 (2-20자)',
    example: 'cooluser123',
    minLength: 2,
    maxLength: 20,
  })
  @IsString()
  @MinLength(2, { message: '닉네임은 최소 2자 이상이어야 합니다.' })
  @MaxLength(20, { message: '닉네임은 최대 20자까지 가능합니다.' })
  nickname: User['nickname'];

  toEntity(hashedPassword: User['password']): User {
    return plainToInstance(User, {
      ...this,
      password: hashedPassword,
    });
  }
}
```

```typescript
// src/modules/auth/dto/request/signIn.body.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';
import { User } from 'src/entities/user/user.entity';

export class SignInBody {
  @ApiProperty({
    description: '로그인 이메일',
    example: 'user@example.com',
  })
  @IsEmail()
  email: User['email'];

  @ApiProperty({
    description: '로그인 비밀번호',
    example: 'password123',
  })
  @IsString()
  password: User['password'];
}
```

```typescript
// src/modules/auth/dto/response/signIn.response.ts
import { ApiProperty } from '@nestjs/swagger';

export class SignInResponse {
  @ApiProperty({
    description: 'JWT Access Token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    type: 'string',
  })
  accessToken: string;
}
```

## 인증 시스템 문서화

### 1. 사용자 API 문서화

```typescript
// src/modules/user/user.controller.ts
import {
  Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiQuery, ApiForbiddenResponse,
} from '@nestjs/swagger';
import { User } from 'src/entities/user/user.entity';
import { UserService } from './user.service';
import { GetUsersByRankDto } from './dto/request/getUsersByRank.dto';
import { UpdateUserBody } from './dto/request/updateUser.body';
import { CurrentUser } from 'src/core/decorator/currentUser.decorator';
import { UserResponse } from './dto/response/user.response';
import { UserRankResponse } from './dto/response/userRank.response';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UserController {
  constructor(private readonly service: UserService) {}

  @ApiOperation({
    summary: '랭킹별 사용자 목록 조회',
    description: `
      점수 기준으로 정렬된 사용자 목록을 페이징으로 조회합니다.
      
      **정렬 기준:** 점수 높은 순
      **페이징:** page와 limit 파라미터 사용
    `
  })
  @ApiQuery({
    name: 'page',
    description: '페이지 번호 (1부터 시작)',
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: '페이지당 항목 수',
    example: 10,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: '랭킹 목록 조회 성공',
    type: [UserRankResponse],
  })
  @Get('/rank')
  async getUsersByRank(@Query() query: GetUsersByRankDto) {
    return this.service.getUsersByRank(query);
  }

  @ApiOperation({
    summary: '특정 사용자의 랭킹 조회',
    description: '특정 사용자의 현재 랭킹 정보를 조회합니다.'
  })
  @ApiParam({
    name: 'userId',
    description: '사용자 ID (UUID 형식)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '사용자 랭킹 조회 성공',
    example: {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      rank: 5,
      score: 1250
    }
  })
  @Get('/:userId/rank')
  async getUserRank(@Param('userId', ParseUUIDPipe) userId: User['id']) {
    return this.service.getUserRank(userId);
  }

  @ApiOperation({
    summary: '내 프로필 조회',
    description: '현재 로그인한 사용자의 프로필 정보를 조회합니다.'
  })
  @ApiResponse({
    status: 200,
    description: '프로필 조회 성공',
    type: UserResponse,
  })
  @Get('/me')
  async getMe(@CurrentUser() user: User): Promise<UserResponse> {
    return this.service.getUser(user.id);
  }

  @ApiOperation({
    summary: '내 프로필 수정',
    description: `
      현재 로그인한 사용자의 프로필을 수정합니다.
      
      **수정 가능한 필드:**
      - nickname: 닉네임 (2-20자)
    `
  })
  @ApiResponse({
    status: 200,
    description: '프로필 수정 성공',
    type: UserResponse,
  })
  @Patch('/me')
  async updateMe(
    @CurrentUser() user: User,
    @Body() body: UpdateUserBody
  ): Promise<UserResponse> {
    return this.service.updateUser(user.id, body);
  }

  @ApiOperation({
    summary: '사용자 점수 업데이트',
    description: `
      특정 사용자의 점수를 업데이트합니다.
      
      **주의사항:**
      - 관리자 권한이 필요할 수 있습니다
      - 점수는 0 이상이어야 합니다
    `
  })
  @ApiParam({
    name: 'userId',
    description: '점수를 업데이트할 사용자 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '점수 업데이트 성공',
  })
  @Patch('/:userId/score')
  async updateScore(
    @Param('userId', ParseUUIDPipe) userId: User['id'],
    @Body() body: UpdateUserScoreDto,
  ) {
    await this.service.updateScore(userId, body.score);
    return { message: '점수가 업데이트되었습니다.' };
  }
}
```

### 2. 포스트 API 문서화

```typescript
// src/modules/post/post.controller.ts
import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe,
  Patch, Post, Query,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiQuery, ApiForbiddenResponse, ApiCreatedResponse,
} from '@nestjs/swagger';
import { PostService } from './post.service';
import { CreatePostBody } from './dto/request/createPostBody';
import { UpdatePostBody } from './dto/request/updatePost.body';
import { GetPostsQuery } from './dto/request/getPosts.query';
import { CurrentUser } from 'src/core/decorator/currentUser.decorator';
import { User } from 'src/entities/user/user.entity';
import { Public } from 'src/core/decorator/public.decorator';
import { Post as PostEntity } from 'src/entities/post/post.entity';
import { PostResponse } from './dto/response/post.response';
import { PostListResponse } from './dto/response/postList.response';

@ApiTags('posts')
@Controller('posts')
export class PostController {
  constructor(private readonly service: PostService) {}

  @ApiOperation({
    summary: '포스트 목록 조회 (공개)',
    description: `
      모든 포스트 목록을 페이징으로 조회합니다.
      인증 없이 접근 가능한 공개 API입니다.
      
      **정렬:** 최신 생성순
      **페이징:** page, limit 파라미터 사용
    `
  })
  @ApiQuery({
    name: 'page',
    description: '페이지 번호',
    example: 1,
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    description: '페이지당 항목 수',
    example: 10,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: '포스트 목록 조회 성공',
    type: PostListResponse,
  })
  @Public()
  @Get()
  async getPosts(@Query() query: GetPostsQuery): Promise<PostListResponse> {
    return this.service.getPosts(query);
  }

  @ApiOperation({
    summary: '포스트 상세 조회 (공개)',
    description: '특정 포스트의 상세 정보를 조회합니다.'
  })
  @ApiParam({
    name: 'id',
    description: '조회할 포스트 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '포스트 조회 성공',
    type: PostResponse,
  })
  @Public()
  @Get('/:id')
  async getPost(@Param('id', ParseUUIDPipe) postId: PostEntity['id']): Promise<PostResponse> {
    return this.service.getPost(postId);
  }

  @ApiOperation({
    summary: '포스트 작성',
    description: `
      새로운 포스트를 작성합니다.
      
      **권한:** 로그인한 사용자만 가능
      **작성자:** 현재 로그인한 사용자로 자동 설정
    `
  })
  @ApiCreatedResponse({
    status: 201,
    description: '포스트 작성 성공',
    type: PostResponse,
  })
  @ApiBearerAuth('JWT-auth')
  @Post()
  async createPost(
    @CurrentUser() user: User,
    @Body() body: CreatePostBody
  ): Promise<PostResponse> {
    return this.service.createPost(user.id, body);
  }

  @ApiOperation({
    summary: '포스트 수정',
    description: `
      기존 포스트를 수정합니다.
      
      **권한:** 포스트 작성자만 수정 가능
      **수정 가능 필드:** 제목, 내용
    `
  })
  @ApiParam({
    name: 'id',
    description: '수정할 포스트 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '포스트 수정 성공',
    type: PostResponse,
  })
  @ApiForbiddenResponse({
    description: '수정 권한 없음 (작성자가 아님)',
    example: {
      statusCode: 403,
      message: '포스트 수정 권한이 없습니다.',
      error: 'Forbidden'
    }
  })
  @ApiBearerAuth('JWT-auth')
  @Patch('/:id')
  async updatePost(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) postId: PostEntity['id'],
    @Body() body: UpdatePostBody,
  ): Promise<PostResponse> {
    return this.service.updatePost(user.id, postId, body);
  }

  @ApiOperation({
    summary: '포스트 삭제',
    description: `
      포스트를 삭제합니다.
      
      **권한:** 포스트 작성자 또는 관리자
    `
  })
  @ApiParam({
    name: 'id',
    description: '삭제할 포스트 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '포스트 삭제 성공',
    example: {
      message: '포스트가 삭제되었습니다.'
    }
  })
  @ApiForbiddenResponse({
    description: '삭제 권한 없음',
  })
  @ApiBearerAuth('JWT-auth')
  @Delete('/:id')
  async deletePost(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) postId: PostEntity['id'],
  ) {
    await this.service.deletePost(user.id, postId);
    return { message: '포스트가 삭제되었습니다.' };
  }
}
```

## Request/Response 스키마 정의

### 1. 응답 DTO 정의

```typescript
// src/modules/user/dto/response/user.response.ts
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { User } from 'src/entities/user/user.entity';

@Exclude()
export class UserResponse {
  @ApiProperty({
    description: '사용자 고유 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: '이메일 주소',
    example: 'user@example.com',
  })
  @Expose()
  email: string;

  @ApiProperty({
    description: '사용자 닉네임',
    example: 'cooluser123',
  })
  @Expose()
  nickname: string;

  @ApiProperty({
    description: '사용자 역할',
    example: 'user',
    enum: ['user', 'admin'],
  })
  @Expose()
  role: string;

  @ApiProperty({
    description: '사용자 점수',
    example: 1250,
  })
  @Expose()
  score: number;

  @ApiProperty({
    description: '계정 생성일',
    example: '2023-01-01T00:00:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: '최종 수정일',
    example: '2023-01-01T00:00:00.000Z',
  })
  @Expose()
  updatedAt: Date;

  constructor(user: User) {
    Object.assign(this, user);
  }
}
```

```typescript
// src/modules/post/dto/response/post.response.ts
import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { Post } from 'src/entities/post/post.entity';
import { UserResponse } from '../../user/dto/response/user.response';

@Exclude()
export class PostResponse {
  @ApiProperty({
    description: '포스트 고유 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: '포스트 제목',
    example: '첫 번째 포스트입니다',
  })
  @Expose()
  title: string;

  @ApiProperty({
    description: '포스트 내용',
    example: '안녕하세요! 첫 번째 포스트를 작성합니다.',
  })
  @Expose()
  content: string;

  @ApiProperty({
    description: '포스트 작성자 정보',
    type: UserResponse,
  })
  @Expose()
  @Type(() => UserResponse)
  user: UserResponse;

  @ApiProperty({
    description: '포스트 생성일',
    example: '2023-01-01T00:00:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: '포스트 수정일',
    example: '2023-01-01T00:00:00.000Z',
  })
  @Expose()
  updatedAt: Date;

  constructor(post: Post) {
    Object.assign(this, post);
    if (post.User) {
      this.user = new UserResponse(post.User);
    }
  }
}
```

### 2. 페이징 응답 DTO

```typescript
// src/common/dto/pagination.response.ts
import { ApiProperty } from '@nestjs/swagger';

export class PaginationMeta {
  @ApiProperty({
    description: '현재 페이지',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: '페이지당 항목 수',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: '전체 항목 수',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: '전체 페이지 수',
    example: 10,
  })
  totalPages: number;

  @ApiProperty({
    description: '다음 페이지 존재 여부',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: '이전 페이지 존재 여부',
    example: false,
  })
  hasPrev: boolean;
}

export function createPaginatedResponse<T>(dataType: any) {
  class PaginatedResponse {
    @ApiProperty({
      description: '데이터 목록',
      type: [dataType],
    })
    data: T[];

    @ApiProperty({
      description: '페이징 메타 정보',
      type: PaginationMeta,
    })
    meta: PaginationMeta;
  }

  return PaginatedResponse;
}
```

```typescript
// src/modules/post/dto/response/postList.response.ts
import { ApiProperty } from '@nestjs/swagger';
import { PostResponse } from './post.response';
import { PaginationMeta } from '../../../common/dto/pagination.response';

export class PostListResponse {
  @ApiProperty({
    description: '포스트 목록',
    type: [PostResponse],
  })
  data: PostResponse[];

  @ApiProperty({
    description: '페이징 정보',
    type: PaginationMeta,
  })
  meta: PaginationMeta;
}
```

## 고급 문서화 패턴

### 1. 에러 응답 표준화

```typescript
// src/common/dto/error.response.ts
import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponse {
  @ApiProperty({
    description: 'HTTP 상태 코드',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description: '에러 메시지',
    example: 'Validation failed',
  })
  message: string | string[];

  @ApiProperty({
    description: '에러 타입',
    example: 'Bad Request',
  })
  error: string;

  @ApiProperty({
    description: '에러 발생 시각',
    example: '2023-01-01T00:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: '요청 경로',
    example: '/api/posts',
  })
  path: string;
}

// 공통 에러 응답 데코레이터
export const ApiErrorResponses = () => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    ApiBadRequestResponse({
      description: '잘못된 요청',
      type: ErrorResponse,
    })(target, propertyName, descriptor);

    ApiUnauthorizedResponse({
      description: '인증 실패',
      type: ErrorResponse,
    })(target, propertyName, descriptor);

    ApiForbiddenResponse({
      description: '권한 없음',
      type: ErrorResponse,
    })(target, propertyName, descriptor);

    ApiNotFoundResponse({
      description: '리소스를 찾을 수 없음',
      type: ErrorResponse,
    })(target, propertyName, descriptor);

    ApiInternalServerErrorResponse({
      description: '서버 내부 오류',
      type: ErrorResponse,
    })(target, propertyName, descriptor);
  };
};
```

### 2. 조건부 스키마 문서화

```typescript
// src/modules/admin/admin.controller.ts
import {
  Controller, Delete, Get, Param, ParseUUIDPipe, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiForbiddenResponse,
} from '@nestjs/swagger';
import { RolesGuard } from 'src/core/guard/roles.guard';
import { Roles } from 'src/core/decorator/roles.decorator';
import { PostService } from '../post/post.service';
import { Post as PostEntity } from 'src/entities/post/post.entity';

@ApiTags('admin')
@ApiBearerAuth('JWT-auth')
@UseGuards(RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly postService: PostService) {}

  @ApiOperation({
    summary: '포스트 강제 삭제 (관리자 전용)',
    description: `
      관리자가 모든 포스트를 삭제할 수 있습니다.
      
      **권한:** admin 역할 필요
      **주의사항:** 삭제된 포스트는 복구할 수 없습니다.
    `
  })
  @ApiParam({
    name: 'postId',
    description: '삭제할 포스트 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '포스트 삭제 성공',
    example: {
      message: '포스트가 관리자에 의해 삭제되었습니다.',
      deletedAt: '2023-01-01T00:00:00.000Z',
      deletedBy: 'admin@example.com'
    }
  })
  @ApiForbiddenResponse({
    description: '관리자 권한 필요',
    example: {
      statusCode: 403,
      message: 'RolesGuard Error: User: user123, user role: user, Required Roles: admin is not authorized',
      error: 'Forbidden'
    }
  })
  @Delete('/posts/:postId')
  async deletePost(@Param('postId', ParseUUIDPipe) postId: PostEntity['id']) {
    await this.postService.deletePostByAdmin(postId);
    return {
      message: '포스트가 관리자에 의해 삭제되었습니다.',
      deletedAt: new Date().toISOString(),
    };
  }
}
```

### 3. API 버전 관리

```typescript
// src/main.ts - API 버전 관리
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // API 버전 관리 설정
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'v',
  });

  const config = new DocumentBuilder()
    .setTitle('NestJS Practice API')
    .setDescription('NestJS 프로젝트 API 문서')
    .setVersion('1.0')
    .addTag('v1', 'API 버전 1')
    .addTag('v2', 'API 버전 2 (베타)')
    // ... 기타 설정
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
```

```typescript
// src/modules/user/user.controller.ts - 버전별 컨트롤러
@ApiTags('users', 'v1')
@Controller({ path: 'users', version: '1' })
export class UserV1Controller {
  // V1 API 구현
}

@ApiTags('users', 'v2')
@Controller({ path: 'users', version: '2' })
export class UserV2Controller {
  // V2 API 구현 (새로운 기능 추가)
}
```

## 프론트엔드 협업 가이드

### 1. TypeScript 타입 생성

```typescript
// scripts/generate-api-types.ts
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { NestFactory } from '@nestjs/core';
import * as fs from 'fs';

async function generateApiTypes() {
  const app = await NestFactory.create(AppModule);
  
  const config = new DocumentBuilder()
    .setTitle('API Types')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  
  // OpenAPI 스펙을 JSON으로 출력
  fs.writeFileSync('./api-spec.json', JSON.stringify(document, null, 2));
  
  console.log('API 스펙이 api-spec.json 파일로 생성되었습니다.');
  console.log('프론트엔드에서 다음 명령어로 타입을 생성하세요:');
  console.log('npx openapi-typescript api-spec.json --output types/api.ts');
  
  await app.close();
}

generateApiTypes();
```

### 2. API 클라이언트 생성 가이드

```bash
# 프론트엔드 프로젝트에서 실행
# 1. OpenAPI Generator 설치
npm install -g @openapitools/openapi-generator-cli

# 2. TypeScript Axios 클라이언트 생성
openapi-generator-cli generate \
  -i http://localhost:3000/api-json \
  -g typescript-axios \
  -o ./src/api \
  --additional-properties=withSeparateModelsAndApi=true

# 3. 또는 React Query와 함께 사용하는 경우
npx @rtk-query/codegen-openapi openapi-config.ts
```

```typescript
// frontend/src/api/client.ts - 프론트엔드 API 클라이언트 설정
import { Configuration, AuthApi, UsersApi, PostsApi } from './generated';

const configuration = new Configuration({
  basePath: 'http://localhost:3000',
  accessToken: () => localStorage.getItem('accessToken') || '',
});

export const authApi = new AuthApi(configuration);
export const usersApi = new UsersApi(configuration);
export const postsApi = new PostsApi(configuration);

// React Query와 함께 사용하는 예시
export const useSignIn = () => {
  return useMutation({
    mutationFn: (data: SignInBody) => authApi.authSignInPost(data),
    onSuccess: (response) => {
      localStorage.setItem('accessToken', response.data.accessToken);
    },
  });
};
```

### 3. Mock 서버 설정

```json
// package.json에 추가
{
  "scripts": {
    "mock:server": "prism mock http://localhost:3000/api-json -p 4010"
  },
  "devDependencies": {
    "@stoplight/prism-cli": "^4.10.5"
  }
}
```

```typescript
// frontend/src/config/api.ts - 환경별 API 설정
const API_ENDPOINTS = {
  development: 'http://localhost:3000',
  mock: 'http://localhost:4010',
  staging: 'https://api-staging.example.com',
  production: 'https://api.example.com',
};

export const API_BASE_URL = API_ENDPOINTS[process.env.NODE_ENV as keyof typeof API_ENDPOINTS] || API_ENDPOINTS.development;
```

## 실무 활용 팁

### 1. Swagger UI 커스터마이징

```typescript
// src/main.ts - 고급 Swagger 설정
const swaggerOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'none', // 'list', 'full', 'none'
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    tryItOutEnabled: true,
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { 
      color: #3b82f6; 
      font-size: 2rem;
    }
    .swagger-ui .scheme-container { 
      background: #f8fafc; 
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem;
      margin: 1rem 0;
    }
    .swagger-ui .opblock .opblock-summary {
      border-left: 4px solid #3b82f6;
      padding-left: 10px;
    }
  `,
  customSiteTitle: 'NestJS Practice API Docs',
  customfavIcon: '/favicon.ico',
  customJs: [
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
  ],
};

SwaggerModule.setup('api', app, document, swaggerOptions);
```

### 2. 개발 워크플로우 최적화

```typescript
// src/core/interceptors/swagger-logging.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class SwaggerLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, params } = request;

    // 개발 환경에서만 상세 로그 출력
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Call] ${method} ${url}`);
      console.log('Body:', body);
      console.log('Query:', query);
      console.log('Params:', params);
    }

    return next.handle().pipe(
      tap((response) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[API Response] ${method} ${url}:`, response);
        }
      }),
    );
  }
}
```

### 3. CI/CD에서 API 문서 자동 배포

```yaml
# .github/workflows/api-docs.yml
name: Deploy API Documentation

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate OpenAPI Spec
        run: |
          npm run build
          node dist/scripts/generate-openapi-spec.js
          
      - name: Deploy to GitHub Pages
        if: github.ref == 'refs/heads/main'
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
          
      - name: Comment PR with API Docs Link
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '📖 API 문서가 업데이트되었습니다: https://your-username.github.io/nestjs-practice'
            })
```

### 4. API 문서 품질 체크

```typescript
// scripts/validate-swagger.ts
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function validateSwaggerDocs() {
  const app = await NestFactory.create(AppModule);
  
  const config = new DocumentBuilder()
    .setTitle('API Validation')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  
  // 문서화되지 않은 엔드포인트 체크
  const undocumentedPaths = [];
  const paths = Object.keys(document.paths);
  
  // 필수 문서화 요소 체크
  let validationErrors = [];
  
  for (const path of paths) {
    const pathObj = document.paths[path];
    for (const method of Object.keys(pathObj)) {
      const operation = pathObj[method];
      
      if (!operation.summary) {
        validationErrors.push(`${method.toUpperCase()} ${path}: summary 누락`);
      }
      
      if (!operation.responses['200'] && !operation.responses['201']) {
        validationErrors.push(`${method.toUpperCase()} ${path}: 성공 응답 스키마 누락`);
      }
      
      if (!operation.tags || operation.tags.length === 0) {
        validationErrors.push(`${method.toUpperCase()} ${path}: 태그 누락`);
      }
    }
  }
  
  if (validationErrors.length > 0) {
    console.error('❌ Swagger 문서화 검증 실패:');
    validationErrors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  } else {
    console.log('✅ Swagger 문서화 검증 통과');
  }
  
  await app.close();
}

validateSwaggerDocs();
```

### 5. 팀 내 API 문서 가이드라인

```markdown
## API 문서화 가이드라인

### 필수 사항
1. **모든 엔드포인트**에 `@ApiOperation` 추가
2. **모든 요청/응답 DTO**에 `@ApiProperty` 추가
3. **에러 응답**에 대한 `@Api*Response` 추가
4. **인증이 필요한 API**에 `@ApiBearerAuth` 추가

### 권장 사항
1. **예시 데이터** 포함하여 실제 사용 예시 제공
2. **상세한 설명** 작성 (단순히 "사용자 조회"가 아닌 구체적 설명)
3. **제약 사항** 명시 (권한, 유효성 검사 등)
4. **비즈니스 로직** 설명 포함

### 예시
```typescript
@ApiOperation({
  summary: '사용자 프로필 수정',
  description: `
    현재 로그인한 사용자의 프로필을 수정합니다.
    
    **수정 가능한 필드:**
    - nickname: 2-20자, 특수문자 제외
    
    **제약 사항:**
    - 본인의 프로필만 수정 가능
    - 닉네임은 중복될 수 있음
    
    **비즈니스 로직:**
    - 수정 시 자동으로 updatedAt 필드가 갱신됨
    - 캐시가 무효화되어 다음 조회 시 DB에서 최신 정보를 가져옴
  `
})
```

이 가이드를 통해 팀의 API 문서화 수준을 높이고, 프론트엔드와의 협업 효율성을 극대화할 수 있습니다.
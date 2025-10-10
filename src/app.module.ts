import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { UserModule } from './modules/user/user.module';
import { PostModule } from './modules/post/post.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { CategoryModule } from './modules/category/category.module';
import { ProductModule } from './modules/product/product.module';
import { FileModule } from './modules/file/file.module';

const applicationModules = [UserModule, PostModule, AuthModule, AdminModule, CategoryModule, ProductModule, FileModule];

@Module({
  imports: [CoreModule, ...applicationModules],
})
export class AppModule {}

import { Module } from '@nestjs/common';

import { AdminModule } from '../admin/admin.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminCategoryController } from './admin-category.controller';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

@Module({
  imports: [PrismaModule, AdminModule],
  controllers: [CategoryController, AdminCategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}

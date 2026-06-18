import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { ApiCommonErrorResponses } from '../common/decorators/api-common-error-responses.decorator';
import { ApiWrappedOkResponse } from '../common/decorators/api-wrapped-ok-response.decorator';
import { CategoryService } from './category.service';
import { CategoryResponseDto, CategoryTreeNodeResponseDto } from './dto/category-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('admin-categories')
@ApiBearerAuth()
@ApiCommonErrorResponses()
@UseGuards(AdminAuthGuard)
@Controller('admin/categories')
export class AdminCategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiWrappedOkResponse({
    description: 'Create a category as merchant admin.',
    type: CategoryResponseDto,
  })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Get()
  @ApiWrappedOkResponse({
    description: 'List all categories as merchant admin.',
    type: CategoryResponseDto,
    isArray: true,
  })
  findMany() {
    return this.categoryService.findMany();
  }

  @Get('tree')
  @ApiWrappedOkResponse({
    description: 'Returns category tree as merchant admin.',
    type: CategoryTreeNodeResponseDto,
    isArray: true,
  })
  findTree() {
    return this.categoryService.findTree();
  }

  @Get(':id')
  @ApiWrappedOkResponse({
    description: 'Get category detail as merchant admin.',
    type: CategoryResponseDto,
  })
  findById(@Param('id') id: string) {
    return this.categoryService.findById(id);
  }

  @Patch(':id')
  @ApiWrappedOkResponse({
    description: 'Update a category as merchant admin.',
    type: CategoryResponseDto,
  })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @ApiWrappedOkResponse({
    description: 'Delete a category as merchant admin.',
    type: CategoryResponseDto,
  })
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { ApiCommonErrorResponses } from '../common/decorators/api-common-error-responses.decorator';
import { ApiWrappedOkResponse } from '../common/decorators/api-wrapped-ok-response.decorator';
import { CategoryService } from './category.service';
import { CategoryResponseDto, CategoryTreeNodeResponseDto } from './dto/category-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('categories')
@ApiCommonErrorResponses({ unauthorized: false, forbidden: false })
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiCommonErrorResponses({ badRequest: false, notFound: false })
  @ApiWrappedOkResponse({ description: 'Create a category.', type: CategoryResponseDto })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Get()
  @ApiWrappedOkResponse({
    description: 'List all categories.',
    type: CategoryResponseDto,
    isArray: true,
  })
  findMany() {
    return this.categoryService.findManyPublic();
  }

  @Get('tree')
  @ApiWrappedOkResponse({
    description: 'Returns category tree.',
    type: CategoryTreeNodeResponseDto,
    isArray: true,
  })
  findTree() {
    return this.categoryService.findTreePublic();
  }

  @Get(':id')
  @ApiWrappedOkResponse({ description: 'Get category detail.', type: CategoryResponseDto })
  findById(@Param('id') id: string) {
    return this.categoryService.findById(id);
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiCommonErrorResponses({ badRequest: false, notFound: false })
  @ApiWrappedOkResponse({ description: 'Update a category.', type: CategoryResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiCommonErrorResponses({ badRequest: false, notFound: false })
  @ApiWrappedOkResponse({ description: 'Delete a category.', type: CategoryResponseDto })
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}

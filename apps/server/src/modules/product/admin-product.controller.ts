import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { ApiCommonErrorResponses } from '../common/decorators/api-common-error-responses.decorator';
import { ApiWrappedOkResponse } from '../common/decorators/api-wrapped-ok-response.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductService } from './product.service';

@ApiTags('admin-products')
@ApiBearerAuth()
@ApiCommonErrorResponses()
@UseGuards(AdminAuthGuard)
@Controller('admin/products')
export class AdminProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiWrappedOkResponse({
    description: 'Create a product as merchant admin.',
    type: ProductResponseDto,
  })
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  @ApiWrappedOkResponse({
    description: 'List products as merchant admin.',
    type: ProductResponseDto,
    isArray: true,
  })
  findMany(@Query() query: QueryProductsDto) {
    return this.productService.findMany(query);
  }

  @Get(':id')
  @ApiWrappedOkResponse({
    description: 'Get product detail as merchant admin.',
    type: ProductResponseDto,
  })
  findById(@Param('id') id: string) {
    return this.productService.findById(id);
  }

  @Patch(':id')
  @ApiWrappedOkResponse({
    description: 'Update product, SKUs and images as merchant admin.',
    type: ProductResponseDto,
  })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiWrappedOkResponse({
    description: 'Update product status as merchant admin.',
    type: ProductResponseDto,
  })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateProductStatusDto) {
    return this.productService.updateStatus(id, dto);
  }

  @Delete(':id')
  @ApiWrappedOkResponse({
    description: 'Delete product as merchant admin.',
    type: ProductResponseDto,
  })
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}

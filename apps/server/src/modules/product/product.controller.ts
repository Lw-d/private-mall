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
import { HomeBannerResponseDto } from './dto/home-banner-response.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductService } from './product.service';

@ApiTags('products')
@ApiCommonErrorResponses({ unauthorized: false, forbidden: false })
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiCommonErrorResponses({ badRequest: false, notFound: false })
  @ApiWrappedOkResponse({
    description: 'Create a product with SKUs and images.',
    type: ProductResponseDto,
  })
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  @ApiWrappedOkResponse({
    description: 'List products.',
    type: ProductResponseDto,
    isArray: true,
  })
  findMany(@Query() query: QueryProductsDto) {
    return this.productService.findManyPublic(query);
  }

  @Get('/home-banners')
  @ApiWrappedOkResponse({
    description: 'List home carousel banner products.',
    type: HomeBannerResponseDto,
    isArray: true,
  })
  findHomeBanners() {
    return this.productService.findHomeBanners();
  }

  @Get(':id')
  @ApiWrappedOkResponse({ description: 'Get product detail.', type: ProductResponseDto })
  findById(@Param('id') id: string) {
    return this.productService.findPublicById(id);
  }

  @Patch(':id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiCommonErrorResponses({ badRequest: false, notFound: false })
  @ApiWrappedOkResponse({
    description: 'Update product, SKUs and images.',
    type: ProductResponseDto,
  })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiCommonErrorResponses({ badRequest: false, notFound: false })
  @ApiWrappedOkResponse({ description: 'Update product status.', type: ProductResponseDto })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateProductStatusDto) {
    return this.productService.updateStatus(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiCommonErrorResponses({ badRequest: false, notFound: false })
  @ApiWrappedOkResponse({ description: 'Delete product.', type: ProductResponseDto })
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}

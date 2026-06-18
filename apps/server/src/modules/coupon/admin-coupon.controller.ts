import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AdminAuthGuard } from '../admin/guards/admin-auth.guard';
import { ApiCommonErrorResponses } from '../common/decorators/api-common-error-responses.decorator';
import { ApiWrappedOkResponse } from '../common/decorators/api-wrapped-ok-response.decorator';
import { CouponService } from './coupon.service';
import { CouponResponseDto } from './dto/coupon-response.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { QueryCouponsDto } from './dto/query-coupons.dto';
import { UpdateCouponStatusDto } from './dto/update-coupon-status.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@ApiTags('admin-coupons')
@ApiBearerAuth()
@ApiCommonErrorResponses()
@UseGuards(AdminAuthGuard)
@Controller('admin/coupons')
export class AdminCouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post()
  @ApiWrappedOkResponse({
    description: 'Create a coupon as merchant admin.',
    type: CouponResponseDto,
  })
  create(@Body() dto: CreateCouponDto) {
    return this.couponService.create(dto);
  }

  @Get()
  @ApiWrappedOkResponse({
    description: 'List coupons as merchant admin.',
    type: CouponResponseDto,
    isArray: true,
  })
  findMany(@Query() query: QueryCouponsDto) {
    return this.couponService.findMany(query);
  }

  @Get(':id')
  @ApiWrappedOkResponse({
    description: 'Get coupon detail as merchant admin.',
    type: CouponResponseDto,
  })
  findById(@Param('id') id: string) {
    return this.couponService.findById(id);
  }

  @Patch(':id')
  @ApiWrappedOkResponse({
    description: 'Update coupon as merchant admin.',
    type: CouponResponseDto,
  })
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiWrappedOkResponse({
    description: 'Update coupon status as merchant admin.',
    type: CouponResponseDto,
  })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateCouponStatusDto) {
    return this.couponService.updateStatus(id, dto);
  }
}

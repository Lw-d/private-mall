import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ApiCommonErrorResponses } from '../common/decorators/api-common-error-responses.decorator';
import { ApiWrappedOkResponse } from '../common/decorators/api-wrapped-ok-response.decorator';
import { CouponService } from './coupon.service';
import { CouponResponseDto, UserCouponResponseDto } from './dto/coupon-response.dto';
import { QueryAvailableCouponsDto } from './dto/query-available-coupons.dto';

@ApiTags('coupons')
@ApiBearerAuth()
@ApiCommonErrorResponses()
@UseGuards(JwtAuthGuard)
@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Get('claimable')
  @ApiWrappedOkResponse({
    description: 'List claimable coupons for current miniapp user.',
    type: CouponResponseDto,
    isArray: true,
  })
  findClaimable(@CurrentUser() user: AuthenticatedUser) {
    return this.couponService.findClaimable(user.id);
  }

  @Post(':id/claim')
  @ApiWrappedOkResponse({
    description: 'Claim a coupon for current miniapp user.',
    type: UserCouponResponseDto,
  })
  claim(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.couponService.claim(user.id, id);
  }

  @Get('my')
  @ApiWrappedOkResponse({
    description: 'List current miniapp user coupons.',
    type: UserCouponResponseDto,
    isArray: true,
  })
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.couponService.findMine(user.id);
  }

  @Get('available-for-order')
  @ApiWrappedOkResponse({
    description: 'List current miniapp user coupons available for an order amount.',
    type: UserCouponResponseDto,
    isArray: true,
  })
  findAvailableForOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryAvailableCouponsDto,
  ) {
    return this.couponService.findAvailableForOrder(user.id, query);
  }
}

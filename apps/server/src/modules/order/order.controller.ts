import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ApiCommonErrorResponses } from '../common/decorators/api-common-error-responses.decorator';
import { ApiWrappedOkResponse } from '../common/decorators/api-wrapped-ok-response.decorator';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderListResultDto } from './dto/order-list-result.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { OrderService } from './order.service';

@ApiTags('orders')
@ApiBearerAuth()
@ApiCommonErrorResponses()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({
    summary: '小程序用户从购物车创建订单',
    description: '用户侧接口，仅使用当前登录用户已勾选的购物车商品创建订单。',
  })
  @ApiWrappedOkResponse({
    type: OrderResponseDto,
    description: 'Create order from checked cart items.',
  })
  createFromCart(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) {
    return this.orderService.createFromCart(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: '小程序用户查询自己的订单列表',
    description: '用户侧接口，只返回当前登录用户的订单，支持按订单状态筛选和分页。',
  })
  @ApiWrappedOkResponse({
    type: OrderListResultDto,
    description: 'List current user orders with pagination.',
  })
  findMany(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryOrdersDto) {
    return this.orderService.findMany(user.id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: '小程序用户查询自己的订单详情',
    description: '用户侧接口，只允许访问当前登录用户自己的订单。',
  })
  @ApiWrappedOkResponse({ type: OrderResponseDto, description: 'Get order detail.' })
  findById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.orderService.findById(user.id, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: '小程序用户取消待支付订单',
    description: '用户侧接口，仅允许取消当前用户自己的待支付订单。',
  })
  @ApiWrappedOkResponse({
    type: OrderResponseDto,
    description: 'Cancel pending payment order.',
  })
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orderService.cancel(user.id, id, dto);
  }

  @Patch(':id/complete')
  @ApiOperation({
    summary: '小程序用户确认收货',
    description: '用户侧接口，仅允许当前用户将自己的已发货订单确认完成。',
  })
  @ApiWrappedOkResponse({ type: OrderResponseDto, description: 'Complete shipped order.' })
  complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.orderService.complete(user.id, id);
  }
}

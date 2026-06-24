import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiCommonErrorResponses } from '../common/decorators/api-common-error-responses.decorator';
import { ApiWrappedOkResponse } from '../common/decorators/api-wrapped-ok-response.decorator';
import { AddOrderLogisticsTraceDto } from '../order/dto/add-order-logistics-trace.dto';
import { CancelOrderDto } from '../order/dto/cancel-order.dto';
import { ShipOrderDto } from '../order/dto/ship-order.dto';
import { OrderService } from '../order/order.service';
import { AdminOrderDto, AdminOrderListResultDto } from './dto/admin-order-list-result.dto';
import { QueryAdminOrdersDto } from './dto/query-admin-orders.dto';
import { AdminAuthGuard } from './guards/admin-auth.guard';

@ApiTags('admin-orders')
@ApiBearerAuth()
@ApiCommonErrorResponses()
@UseGuards(AdminAuthGuard)
@Controller('admin/orders')
export class AdminOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @ApiOperation({
    summary: '商家后台分页查询订单',
    description: '商家后台使用，支持订单状态、订单号、用户 openId / 昵称 / 手机号关键词筛选。',
  })
  @ApiWrappedOkResponse({
    type: AdminOrderListResultDto,
    description: 'Returns paginated orders for merchant admin.',
  })
  findMany(@Query() query: QueryAdminOrdersDto) {
    return this.orderService.findManyForAdmin(query);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: '商家后台取消待支付订单',
    description: '仅允许取消待支付订单，取消成功后回滚订单商品库存。',
  })
  @ApiWrappedOkResponse({
    type: AdminOrderDto,
    description: 'Cancel pending payment order as merchant admin.',
  })
  cancel(@Param('id') id: string, @Body() dto: CancelOrderDto) {
    return this.orderService.cancelForAdmin(id, dto);
  }

  @Patch(':id/ship')
  @ApiOperation({
    summary: '商家后台发货',
    description: '仅商家后台可发货。用户侧订单接口不提供发货能力。',
  })
  @ApiWrappedOkResponse({
    type: AdminOrderDto,
    description: 'Ship pending delivery order as merchant admin.',
  })
  ship(@Param('id') id: string, @Body() dto: ShipOrderDto) {
    return this.orderService.shipForAdmin(id, dto);
  }

  @Post(':id/logistics-traces')
  @ApiOperation({
    summary: '商家后台追加订单物流轨迹',
    description: '仅商家后台可追加物流轨迹。订单需要已经发货。',
  })
  @ApiWrappedOkResponse({
    type: AdminOrderDto,
    description: 'Append logistics trace and return latest order detail.',
  })
  addLogisticsTrace(@Param('id') id: string, @Body() dto: AddOrderLogisticsTraceDto) {
    return this.orderService.addLogisticsTraceForAdmin(id, dto);
  }

  @Post(':id/logistics-traces/refresh')
  @ApiOperation({
    summary: '商家后台刷新订单物流轨迹',
    description: '通过物流服务商适配层查询物流轨迹，并幂等写入订单物流轨迹表。',
  })
  @ApiWrappedOkResponse({
    type: AdminOrderDto,
    description: 'Refresh logistics traces and return latest order detail.',
  })
  refreshLogisticsTraces(@Param('id') id: string) {
    return this.orderService.refreshLogisticsTracesForAdmin(id);
  }
}

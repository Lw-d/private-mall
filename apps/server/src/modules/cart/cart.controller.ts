import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ApiCommonErrorResponses } from '../common/decorators/api-common-error-responses.decorator';
import { ApiWrappedOkResponse } from '../common/decorators/api-wrapped-ok-response.decorator';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CartResponseDto } from './dto/cart-response.dto';
import { UpdateCartItemCheckedDto } from './dto/update-cart-item-checked.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@ApiTags('cart')
@ApiBearerAuth()
@ApiCommonErrorResponses()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiWrappedOkResponse({ description: 'Get current user cart.', type: CartResponseDto })
  findCart(@CurrentUser() user: AuthenticatedUser) {
    return this.cartService.findCart(user.id);
  }

  @Post('items')
  @ApiWrappedOkResponse({ description: 'Add SKU to cart.', type: CartResponseDto })
  addItem(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user.id, dto);
  }

  @Patch('items/:skuId')
  @ApiWrappedOkResponse({ description: 'Update cart item quantity.', type: CartResponseDto })
  updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('skuId') skuId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.id, skuId, dto);
  }

  @Patch('items/:skuId/checked')
  @ApiWrappedOkResponse({
    description: 'Update cart item checked status.',
    type: CartResponseDto,
  })
  updateChecked(
    @CurrentUser() user: AuthenticatedUser,
    @Param('skuId') skuId: string,
    @Body() dto: UpdateCartItemCheckedDto,
  ) {
    return this.cartService.updateChecked(user.id, skuId, dto);
  }

  @Delete('items/:skuId')
  @ApiWrappedOkResponse({ description: 'Remove cart item.', type: CartResponseDto })
  removeItem(@CurrentUser() user: AuthenticatedUser, @Param('skuId') skuId: string) {
    return this.cartService.removeItem(user.id, skuId);
  }
}

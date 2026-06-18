import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ApiCommonErrorResponses } from '../common/decorators/api-common-error-responses.decorator';
import { ApiWrappedOkResponse } from '../common/decorators/api-wrapped-ok-response.decorator';
import { AddressService } from './address.service';
import { AddressResponseDto } from './dto/address-response.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@ApiTags('addresses')
@ApiBearerAuth()
@ApiCommonErrorResponses()
@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Get()
  @ApiOperation({ summary: '小程序用户查询收货地址列表' })
  @ApiWrappedOkResponse({
    type: AddressResponseDto,
    isArray: true,
    description: 'List current user addresses.',
  })
  findMany(@CurrentUser() user: AuthenticatedUser) {
    return this.addressService.findMany(user.id);
  }

  @Get('default')
  @ApiOperation({ summary: '小程序用户查询默认收货地址' })
  @ApiWrappedOkResponse({
    type: AddressResponseDto,
    description: 'Get current user default address.',
  })
  findDefault(@CurrentUser() user: AuthenticatedUser) {
    return this.addressService.findDefault(user.id);
  }

  @Post()
  @ApiOperation({ summary: '小程序用户新增收货地址' })
  @ApiWrappedOkResponse({ type: AddressResponseDto, description: 'Create current user address.' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAddressDto) {
    return this.addressService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '小程序用户更新收货地址' })
  @ApiWrappedOkResponse({ type: AddressResponseDto, description: 'Update current user address.' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressService.update(user.id, id, dto);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: '小程序用户设置默认收货地址' })
  @ApiWrappedOkResponse({
    type: AddressResponseDto,
    description: 'Set current user default address.',
  })
  setDefault(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.addressService.setDefault(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '小程序用户删除收货地址' })
  @ApiWrappedOkResponse({ type: AddressResponseDto, description: 'Delete current user address.' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.addressService.remove(user.id, id);
  }
}

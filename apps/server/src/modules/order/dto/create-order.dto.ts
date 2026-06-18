import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOrderDto {
  @ApiPropertyOptional({ example: 'cmp_address_id' })
  @IsOptional()
  @IsString()
  shippingAddressId?: string;

  @ApiPropertyOptional({ example: 'cmp_user_coupon_id' })
  @IsOptional()
  @IsString()
  userCouponId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  usePoints?: boolean;

  @ApiPropertyOptional({ example: '请尽快发货' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  remark?: string;
}

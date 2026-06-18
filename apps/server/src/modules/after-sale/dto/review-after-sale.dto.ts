import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ApproveAfterSaleDto {
  @ApiPropertyOptional({ type: Number, example: 99 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  approvedAmount?: number;

  @ApiPropertyOptional({ type: String, example: '审核通过，请等待后续处理。' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  merchantRemark?: string;
}

export class RejectAfterSaleDto {
  @ApiProperty({ type: String, example: '商品已影响二次销售，暂不支持退款。' })
  @IsString()
  @MaxLength(191)
  rejectReason!: string;

  @ApiPropertyOptional({ type: String, example: '已电话联系用户说明原因。' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  merchantRemark?: string;
}

export class SubmitReturnLogisticsDto {
  @ApiProperty({ type: String, example: '顺丰速运' })
  @IsString()
  @MaxLength(64)
  returnLogisticsCompany!: string;

  @ApiProperty({ type: String, example: 'SF1234567890' })
  @IsString()
  @MaxLength(64)
  returnTrackingNo!: string;

  @ApiPropertyOptional({ type: String, example: '已按商家地址寄回。' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  returnRemark?: string;
}

export class ConfirmReturnReceivedDto {
  @ApiPropertyOptional({ type: String, example: '退货已签收，商品状态正常。' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  merchantRemark?: string;
}

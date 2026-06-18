import 'reflect-metadata';

import { Type } from 'class-transformer';
import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  validateSync,
  ValidateIf,
} from 'class-validator';

class EnvironmentVariables {
  @IsOptional()
  @IsIn(['mock', 'real'])
  WECHAT_LOGIN_MODE?: string;

  @ValidateIf((env: EnvironmentVariables) => env.WECHAT_LOGIN_MODE === 'real')
  @IsString()
  @IsNotEmpty()
  WECHAT_MINIAPP_APP_ID?: string;

  @ValidateIf((env: EnvironmentVariables) => env.WECHAT_LOGIN_MODE === 'real')
  @IsString()
  @IsNotEmpty()
  WECHAT_MINIAPP_SECRET?: string;

  @IsOptional()
  @IsIn(['mock', 'real'])
  WECHAT_PAY_MODE?: string;

  @ValidateIf((env: EnvironmentVariables) => env.WECHAT_PAY_MODE === 'real')
  @IsString()
  @IsNotEmpty()
  WECHAT_PAY_MCH_ID?: string;

  @ValidateIf((env: EnvironmentVariables) => env.WECHAT_PAY_MODE === 'real')
  @IsString()
  @IsNotEmpty()
  WECHAT_PAY_SERIAL_NO?: string;

  @ValidateIf((env: EnvironmentVariables) => env.WECHAT_PAY_MODE === 'real')
  @IsString()
  @IsNotEmpty()
  WECHAT_PAY_API_V3_KEY?: string;

  @ValidateIf((env: EnvironmentVariables) => env.WECHAT_PAY_MODE === 'real')
  @IsString()
  @IsNotEmpty()
  WECHAT_PAY_PRIVATE_KEY_PATH?: string;

  @ValidateIf((env: EnvironmentVariables) => env.WECHAT_PAY_MODE === 'real')
  @IsString()
  @IsNotEmpty()
  WECHAT_PAY_PLATFORM_PUBLIC_KEY_PATH?: string;

  @ValidateIf((env: EnvironmentVariables) => env.WECHAT_PAY_MODE === 'real')
  @IsString()
  @IsNotEmpty()
  WECHAT_PAY_NOTIFY_URL?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  WECHAT_PAY_REFUND_NOTIFY_URL?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  POINTS_REDEEM_POINTS_PER_YUAN?: number;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}

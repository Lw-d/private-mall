import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

import { ApiSuccessResponseDto } from '../dto/api-response.dto';

interface ApiWrappedOkResponseOptions {
  description: string;
  type?: Type<unknown>;
  isArray?: boolean;
}

export function ApiWrappedOkResponse(options: ApiWrappedOkResponseOptions) {
  const dataSchema = options.type
    ? options.isArray
      ? {
          type: 'array',
          items: { $ref: getSchemaPath(options.type) },
        }
      : { $ref: getSchemaPath(options.type) }
    : {};
  const models = options.type ? [ApiSuccessResponseDto, options.type] : [ApiSuccessResponseDto];

  return applyDecorators(
    ApiExtraModels(...models),
    ApiOkResponse({
      description: options.description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiSuccessResponseDto) },
          {
            properties: {
              data: dataSchema,
            },
          },
        ],
      },
    }),
  );
}

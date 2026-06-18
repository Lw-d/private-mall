import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';

import { ApiErrorResponseDto } from '../dto/api-response.dto';

interface ApiCommonErrorResponsesOptions {
  badRequest?: boolean;
  unauthorized?: boolean;
  forbidden?: boolean;
  notFound?: boolean;
}

const errorSchema = {
  $ref: getSchemaPath(ApiErrorResponseDto),
};

export function ApiCommonErrorResponses(options: ApiCommonErrorResponsesOptions = {}) {
  const { badRequest = true, unauthorized = true, forbidden = true, notFound = true } = options;

  const decorators = [ApiExtraModels(ApiErrorResponseDto)];

  if (badRequest) {
    decorators.push(
      ApiBadRequestResponse({
        description: 'Bad request or validation failed.',
        schema: errorSchema,
      }),
    );
  }

  if (unauthorized) {
    decorators.push(
      ApiUnauthorizedResponse({
        description: 'Authentication is missing or invalid.',
        schema: errorSchema,
      }),
    );
  }

  if (forbidden) {
    decorators.push(
      ApiForbiddenResponse({
        description: 'Current user cannot access this resource.',
        schema: errorSchema,
      }),
    );
  }

  if (notFound) {
    decorators.push(
      ApiNotFoundResponse({
        description: 'Resource not found.',
        schema: errorSchema,
      }),
    );
  }

  return applyDecorators(...decorators);
}

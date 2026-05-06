import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto';
import { SuccessResponseDto } from '../dto/success-response.dto';

type ApiSuccessResponseOptions = {
  status?: number;
  description: string;
  type?: Type<unknown>;
  isArray?: boolean;
};

type ApiErrorResponseOptions = {
  status: number;
  description: string;
};

export function ApiSuccessResponse(
  options: ApiSuccessResponseOptions,
): MethodDecorator {
  const { status = 200, description, type, isArray = false } = options;

  const dataSchema = type
    ? isArray
      ? { type: 'array', items: { $ref: getSchemaPath(type) } }
      : { $ref: getSchemaPath(type) }
    : { nullable: true };

  const decorators = [
    ApiExtraModels(SuccessResponseDto),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(SuccessResponseDto) },
          {
            properties: {
              data: dataSchema,
            },
          },
        ],
      },
    }),
  ];

  if (type) {
    decorators.unshift(ApiExtraModels(type));
  }

  return applyDecorators(...decorators);
}

export function ApiErrorResponse(options: ApiErrorResponseOptions): MethodDecorator {
  const errorLabel = toHttpErrorLabel(options.status);

  return applyDecorators(
    ApiExtraModels(ErrorResponseDto),
    ApiResponse({
      status: options.status,
      description: options.description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ErrorResponseDto) },
          {
            properties: {
              success: { example: false },
              statusCode: { example: options.status },
              error: { example: errorLabel },
              message: { example: options.description },
              timestamp: { example: '2026-05-06T08:15:00.000Z' },
              path: { example: '/resource' },
            },
          },
        ],
      },
    }),
  );
}

function toHttpErrorLabel(status: number): string {
  switch (status) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Unprocessable Entity';
    default:
      return 'Internal Server Error';
  }
}

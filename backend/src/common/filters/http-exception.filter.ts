import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionPayload =
      exception instanceof HttpException ? exception.getResponse() : null;
    const errorResponse = this.normalizeErrorPayload(exceptionPayload, status);

    response.status(status).json({
      success: false,
      statusCode: status,
      error: errorResponse.error,
      message: errorResponse.message,
      details: errorResponse.details,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private normalizeErrorPayload(
    payload: unknown,
    status: number,
  ): {
    error: string;
    message: string | string[];
    details?: Record<string, unknown>;
  } {
    if (typeof payload === 'string') {
      return { error: this.defaultErrorLabel(status), message: payload };
    }

    if (payload && typeof payload === 'object') {
      const body = payload as Record<string, unknown>;
      const error =
        typeof body.error === 'string'
          ? body.error
          : this.defaultErrorLabel(status);
      const message =
        typeof body.message === 'string' || Array.isArray(body.message)
          ? (body.message as string | string[])
          : 'Unexpected error';

      const details =
        body.details && typeof body.details === 'object'
          ? (body.details as Record<string, unknown>)
          : undefined;

      return { error, message, details };
    }

    return {
      error: this.defaultErrorLabel(status),
      message: 'Internal server error',
    };
  }

  private defaultErrorLabel(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'Bad Request';
      case HttpStatus.UNAUTHORIZED:
        return 'Unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'Forbidden';
      case HttpStatus.NOT_FOUND:
        return 'Not Found';
      case HttpStatus.CONFLICT:
        return 'Conflict';
      default:
        return 'Internal Server Error';
    }
  }
}

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { STATUS_CODES } from 'node:http';

interface ErrorResponseBody {
  code: number;
  message: string;
  error?: unknown;
  timestamp: string;
  path: string;
}

interface ExceptionResponseObject {
  statusCode?: number;
  message?: string | string[];
  error?: unknown;
}

interface HttpResponse {
  status: (statusCode: number) => {
    json: (body: ErrorResponseBody) => void;
  };
}

interface HttpRequest {
  url: string;
  originalUrl?: string;
}

const sensitiveKeyPattern =
  /secret|token|authorization|signature|paysign|private.*key|api.*v3.*key|ciphertext/i;

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<HttpResponse>();
    const request = context.getRequest<HttpRequest>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    if (!(exception instanceof HttpException)) {
      this.logger.error(this.formatUnexpectedException(exception));
    }

    response.status(status).json({
      code: status,
      message: this.resolveMessage(exceptionResponse, exception),
      error: this.resolveError(exceptionResponse, status),
      timestamp: new Date().toISOString(),
      path: request.originalUrl ?? request.url,
    });
  }

  private resolveMessage(exceptionResponse: unknown, exception: unknown): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (this.isExceptionResponseObject(exceptionResponse)) {
      if (Array.isArray(exceptionResponse.message)) {
        return exceptionResponse.message.join('; ');
      }

      if (typeof exceptionResponse.message === 'string') {
        return exceptionResponse.message;
      }
    }

    if (exception instanceof HttpException) {
      return exception.message;
    }

    return 'Internal server error';
  }

  private resolveError(exceptionResponse: unknown, status: number) {
    if (this.isExceptionResponseObject(exceptionResponse) && exceptionResponse.error) {
      return this.redactSensitiveValue(exceptionResponse.error);
    }

    return STATUS_CODES[status] ?? 'Error';
  }

  private redactSensitiveValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.redactSensitiveValue(item));
    }

    if (!this.isExceptionResponseObject(value)) {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sensitiveKeyPattern.test(key) ? '[REDACTED]' : this.redactSensitiveValue(item),
      ]),
    );
  }

  private formatUnexpectedException(exception: unknown): string {
    if (exception instanceof Error) {
      return exception.stack ?? exception.message;
    }

    return String(exception);
  }

  private isExceptionResponseObject(value: unknown): value is ExceptionResponseObject {
    return typeof value === 'object' && value !== null;
  }
}

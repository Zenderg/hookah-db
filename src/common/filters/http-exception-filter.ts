import {
  ExceptionFilter,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import type { Request, Response } from 'express';

interface ExceptionResponseObject {
  message?: string | string[];
  error?: string;
}

interface StatusExceptionObject {
  status?: unknown;
  response?: unknown;
  message?: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getExceptionResponseMessage(
  exceptionResponse: object,
  fallback: string,
): string | string[] {
  const responseObj = exceptionResponse as ExceptionResponseObject;
  return responseObj.message ?? responseObj.error ?? fallback;
}

function getStatusExceptionMessage(
  exceptionObj: StatusExceptionObject,
): string | string[] {
  if (isObject(exceptionObj.response)) {
    const responseMessage = exceptionObj.response.message;
    if (typeof responseMessage === 'string' || Array.isArray(responseMessage)) {
      return responseMessage;
    }
  }

  return typeof exceptionObj.message === 'string'
    ? exceptionObj.message
    : 'Internal server error';
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let httpStatus: number;
    let message: string | string[];

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        message = getExceptionResponseMessage(
          exceptionResponse,
          exception.message,
        );
      } else {
        message = exception.message;
      }
    } else if (
      typeof exception === 'object' &&
      exception !== null &&
      'status' in exception
    ) {
      const exceptionObj = exception as StatusExceptionObject;
      httpStatus =
        typeof exceptionObj.status === 'number'
          ? exceptionObj.status
          : HttpStatus.INTERNAL_SERVER_ERROR;
      message = getStatusExceptionMessage(exceptionObj);
    } else if (exception instanceof Error) {
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
    } else {
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
    }

    const errorResponse = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    };

    // Log the error for debugging
    this.logger.error(
      `${request.method} ${request.url} - Status: ${httpStatus} - Message: ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(httpStatus).json(errorResponse);
  }
}

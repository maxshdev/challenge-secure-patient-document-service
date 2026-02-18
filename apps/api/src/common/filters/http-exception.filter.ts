import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      message = res.message || exception.message;
      error = res.error || exception.name;
    } else if (exception instanceof Error) {
      // Logic for Database unique constraint or common DB errors
      if ((exception as any).code === 'ER_DUP_ENTRY') {
        status = HttpStatus.CONFLICT;
        message = 'The resource already exists.';
        error = 'Duplicate Entry';
      } else {
        // Generic error: obfuscate details in production
        status = HttpStatus.BAD_REQUEST;
        message = exception.message;
        error = 'Bad Request';
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
    });
  }
}

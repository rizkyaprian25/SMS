import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    const req = ctx.getRequest();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = isHttpException ? exception.getResponse() : null;
    const message =
      typeof raw === 'string' ? raw : (raw as { message?: unknown })?.message ?? 'Kesalahan server internal';

    // Structured logging untuk error server 5xx atau unhandled exception
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(
        `[${req?.method ?? 'UNKNOWN'}] ${req?.url ?? ''} -> HTTP ${status} - ${JSON.stringify(message)}`,
        stack,
      );
    }

    res.status(status).json({
      statusCode: status,
      message,
      error: isHttpException ? exception.name : 'InternalServerError',
      path: req?.url,
      timestamp: new Date().toISOString(),
    });
  }
}

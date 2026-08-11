import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

// Operational request logging — deliberately separate from AuditService (see modules/audit),
// which writes the append-only compliance record. This is debugging/ops visibility only,
// matching the two-tier logging split in architecture.md §10.
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, originalUrl, user } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const actor = user?.userId ?? 'anonymous';
        this.logger.log(`${method} ${originalUrl} — ${actor} — ${duration}ms`);
      }),
    );
  }
}

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { Observable, map } from 'rxjs';

/**
 * Resolves the `message` field on every successful response from a
 * translation KEY (set by `ResponseHelper`) into the localized string,
 * using the request's `accept-language` header.
 *
 * Exceptions are NOT touched here — they flow through `HttpExceptionFilter`,
 * which can resolve its own messages against the same i18n service.
 *
 * Heuristic: only translate strings that look like translation keys
 * (contain at least one `.`). Plain text passes through unchanged so
 * services that already returned a localized string aren't double-resolved.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly i18n: I18nService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
    }>();
    const lang =
      req.headers['accept-language']?.split(',')[0]?.trim() || 'en';

    return next.handle().pipe(
      map((payload) => this.resolveMessage(payload, lang)),
    );
  }

  private resolveMessage(payload: unknown, lang: string): unknown {
    if (
      payload &&
      typeof payload === 'object' &&
      'message' in payload &&
      typeof (payload as { message: unknown }).message === 'string'
    ) {
      const message = (payload as { message: string }).message;
      if (message.includes('.')) {
        (payload as { message: string }).message = this.i18n.t(message, {
          lang,
        }) as string;
      }
    }
    return payload;
  }
}

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Authenticates requests via the `jwt` passport strategy. Applied per
 * controller through `@UseGuards(UserAuthGuard)`; routes that should skip
 * authentication (login, refresh, password reset) simply omit the guard.
 */
@Injectable()
export class UserAuthGuard extends AuthGuard('jwt') {}

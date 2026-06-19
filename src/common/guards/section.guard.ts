import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SECTION_KEY } from '../decorators/section.decorator';
import {
  EAdminModule,
  EUserModule,
  Section as SectionValue,
} from '../enums/admin-module.enum';
import { AppRole } from '../decorators/roles.decorator';

const ROLE_SECTIONS: Record<AppRole, Set<SectionValue>> = {
  ADMIN: new Set<SectionValue>([
    EAdminModule.USER_MANAGEMENT,
    EAdminModule.SCHOOL_MANAGEMENT,
    EAdminModule.SUBSCRIPTION_MANAGEMENT,
    EAdminModule.AUDIT_LOGS,
  ]),
  SCHOOL: new Set<SectionValue>([
    EUserModule.PROFILE,
    EUserModule.NOTIFICATIONS,
  ]),
};

@Injectable()
export class SectionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<SectionValue | undefined>(
      SECTION_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required) return true;

    const req = ctx
      .switchToHttp()
      .getRequest<{ user?: { role?: AppRole } }>();
    const role = req.user?.role;
    if (!role || !ROLE_SECTIONS[role]?.has(required)) {
      throw new ForbiddenException(`Section not permitted: ${required}`);
    }
    return true;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { AdminAuditAction, AdminAuditLog } from './admin-audit-log.entity';
import { ListAuditQueryDto } from './dto/list-audit-query.dto';
import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';
import { User } from '../../../common/decorators/current-user.decorator';
import { I18nService } from 'nestjs-i18n';
import { SUCCESS } from '../../../common/constants/messages';

type Envelope<T> = { message: string; data: T };

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly repo: Repository<AdminAuditLog>,
    private readonly i18n: I18nService,
  ) {}

  async record(params: {
    actorId: string | null;
    action: AdminAuditAction;
    targetId?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    try {
      await this.repo.save(
        this.repo.create({
          actorId: params.actorId,
          action: params.action,
          targetId: params.targetId ?? null,
          metadata: params.metadata ?? null,
        }),
      );
    } catch (err) {
      this.logger.error(
        `Failed to write audit log action=${params.action}`,
        (err as Error).stack,
      );
    }
  }

  async list(
    _user: User,
    query: ListAuditQueryDto,
  ): Promise<Envelope<PaginatedResponseDto<AdminAuditLog>>> {
    const { limit, offset, order, actorId, action, from, to } = query;
    const ALLOWED_SORT = new Set(['createdAt', 'action']);
    const where: FindOptionsWhere<AdminAuditLog> = {};
    if (actorId) where.actorId = actorId;
    if (action) where.action = action;
    if (from && to) {
      where.createdAt = Between(from, to);
    } else if (from) {
      where.createdAt = MoreThanOrEqual(from);
    } else if (to) {
      where.createdAt = LessThanOrEqual(to);
    }

    const safeOrder: Record<string, 'ASC' | 'DESC'> = {};
    for (const [col, dir] of Object.entries(order)) {
      if (ALLOWED_SORT.has(col)) safeOrder[col] = dir;
    }
    if (Object.keys(safeOrder).length === 0) safeOrder.createdAt = 'DESC';

    const [items, total] = await this.repo.findAndCount({
      where,
      order: safeOrder,
      skip: offset,
      take: limit,
    });

    return {
      message: SUCCESS.RECORD_LIST_FETCHED('AUDIT_LOG', this.i18n),
      data: { items, total, limit, offset },
    };
  }
}

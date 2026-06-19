import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Announcement } from './entities/announcement.entity';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { ListAnnouncementsQueryDto } from './dto/list-announcements-query.dto';
import { AnnouncementResponseDto } from './dto/announcement-response.dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { AuditService } from '../admin/audit/audit.service';
import { AdminAuditAction } from '../admin/audit/admin-audit-log.entity';
import { User } from '../../common/decorators/current-user.decorator';
import { I18nService } from 'nestjs-i18n';
import { ERROR, SUCCESS } from '../../common/constants/messages';

type Envelope<T> = { message: string; data: T };

/**
 * Business logic for school-wide announcements.
 *
 * Authorization model: admin-only writes are enforced at the HTTP edge by
 * `UserAuthGuard` + `SectionGuard` (@Section ANNOUNCEMENT_MANAGEMENT, granted
 * only to ADMIN). Reads carry no section, so any authenticated principal may
 * list/read. There is no per-row ownership — announcements are global — so the
 * service does not re-check the role; it relies on the guard chain and records
 * the acting admin's id for attribution/audit.
 *
 * Soft delete: writes/reads go through the default repository, which excludes
 * `deleted_at IS NOT NULL` rows automatically.
 */
@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    private readonly i18n: I18nService,
  ) {}

  async create(
    user: User,
    dto: CreateAnnouncementDto,
  ): Promise<Envelope<AnnouncementResponseDto>> {
    const actorId: string | null = user?.id ?? null;
    const repo = this.dataSource.getRepository(Announcement);
    const saved = await repo.save(
      repo.create({
        title: dto.title,
        body: dto.body,
        createdBy: actorId,
      }),
    );

    await this.audit.record({
      actorId,
      action: AdminAuditAction.ANNOUNCEMENT_CREATED,
      targetId: saved.id,
    });

    return {
      message: SUCCESS.RECORD_CREATED('ANNOUNCEMENT', this.i18n),
      data: this.toResponse(saved),
    };
  }

  async update(
    user: User,
    id: string,
    dto: UpdateAnnouncementDto,
  ): Promise<Envelope<AnnouncementResponseDto>> {
    const repo = this.dataSource.getRepository(Announcement);
    const existing = await repo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(this.notFound());
    }

    if (dto.title !== undefined) existing.title = dto.title;
    if (dto.body !== undefined) existing.body = dto.body;
    const saved = await repo.save(existing);

    await this.audit.record({
      actorId: user?.id ?? null,
      action: AdminAuditAction.ANNOUNCEMENT_UPDATED,
      targetId: saved.id,
    });

    return {
      message: SUCCESS.RECORD_UPDATED('ANNOUNCEMENT', this.i18n),
      data: this.toResponse(saved),
    };
  }

  async remove(user: User, id: string): Promise<Envelope<{ id: string }>> {
    const repo = this.dataSource.getRepository(Announcement);
    // softDelete only affects rows not already soft-deleted, so affected === 0
    // covers both "never existed" and "already deleted" — a 404 either way.
    const result = await repo.softDelete({ id });
    if (!result.affected) {
      throw new NotFoundException(this.notFound());
    }

    await this.audit.record({
      actorId: user?.id ?? null,
      action: AdminAuditAction.ANNOUNCEMENT_DELETED,
      targetId: id,
    });

    return {
      message: SUCCESS.RECORD_DELETED('ANNOUNCEMENT', this.i18n),
      data: { id },
    };
  }

  async list(
    _user: User,
    query: ListAnnouncementsQueryDto,
  ): Promise<Envelope<PaginatedResponseDto<AnnouncementResponseDto>>> {
    const { limit, offset, search, order } = query;
    const ALLOWED_SORT = new Set(['createdAt', 'title']);

    const qb = this.dataSource
      .getRepository(Announcement)
      .createQueryBuilder('announcement')
      .skip(offset)
      .take(limit);

    for (const [col, dir] of Object.entries(order)) {
      if (ALLOWED_SORT.has(col)) {
        qb.addOrderBy(`announcement.${col}`, dir === 'ASC' ? 'ASC' : 'DESC');
      }
    }
    if (!Object.keys(order).some((k) => ALLOWED_SORT.has(k))) {
      qb.addOrderBy('announcement.createdAt', 'DESC');
    }

    if (search) {
      qb.andWhere(
        '(LOWER(announcement.title) LIKE :search OR LOWER(announcement.body) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    const [rows, total] = await qb.getManyAndCount();
    return {
      message: SUCCESS.RECORD_LIST_FETCHED('ANNOUNCEMENT', this.i18n),
      data: { items: rows.map((r) => this.toResponse(r)), total, limit, offset },
    };
  }

  async findOne(
    _user: User,
    id: string,
  ): Promise<Envelope<AnnouncementResponseDto>> {
    const announcement = await this.dataSource
      .getRepository(Announcement)
      .findOne({ where: { id } });
    if (!announcement) {
      throw new NotFoundException(this.notFound());
    }
    return {
      message: SUCCESS.RECORD_FETCHED('ANNOUNCEMENT', this.i18n),
      data: this.toResponse(announcement),
    };
  }

  private notFound(): string {
    return ERROR.RECORD_NOT_FOUND('ANNOUNCEMENT', this.i18n);
  }

  private toResponse(a: Announcement): AnnouncementResponseDto {
    return {
      id: a.id,
      title: a.title,
      body: a.body,
      createdBy: a.createdBy,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }
}

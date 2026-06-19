import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AnnouncementsService } from '../src/modules/announcements/announcements.service';
import { Announcement } from '../src/modules/announcements/entities/announcement.entity';
import { AuditService } from '../src/modules/admin/audit/audit.service';
import { AdminAuditAction } from '../src/modules/admin/audit/admin-audit-log.entity';
import { AuthenticatedUser } from '../src/common/decorators/current-user.decorator';

/**
 * Unit tests for AnnouncementsService. DataSource is mocked; getRepository
 * returns a single fake announcement repo. AuditService is a spy. Covers the
 * write/read business logic and the soft-delete + 404 invariants (AC-ANN-1..8).
 * The HTTP auth-invariant matrix (admin vs school vs anonymous) is covered in
 * the e2e suite where the real guard chain runs (AC-ANN-9..12).
 */
describe('AnnouncementsService', () => {
  let service: AnnouncementsService;
  let repo: any;
  let audit: { record: jest.Mock };

  const admin: AuthenticatedUser = { id: 'admin-1', role: 'ADMIN' };

  beforeEach(() => {
    repo = {
      create: jest.fn((x: unknown) => x),
      save: jest.fn(),
      findOne: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const dataSource = {
      getRepository: jest.fn(() => repo),
    } as unknown as DataSource;
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    const i18n = { t: (k: string) => k } as any;
    service = new AnnouncementsService(
      dataSource,
      audit as unknown as AuditService,
      i18n,
    );
  });

  describe('create', () => {
    it('AC-ANN-1: admin creates an announcement; author + audit recorded', async () => {
      repo.save.mockImplementation((a: Partial<Announcement>) =>
        Promise.resolve({
          ...a,
          id: 'ann-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        }),
      );

      const res = await service.create(admin, {
        title: 'Hello',
        body: 'World',
      });

      expect(repo.create).toHaveBeenCalledWith({
        title: 'Hello',
        body: 'World',
        createdBy: 'admin-1',
      });
      expect(res.data.id).toBe('ann-1');
      expect(res.data.createdBy).toBe('admin-1');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          action: AdminAuditAction.ANNOUNCEMENT_CREATED,
          targetId: 'ann-1',
        }),
      );
    });
  });

  describe('update', () => {
    it('AC-ANN-3: updates title/body of an existing announcement', async () => {
      repo.findOne.mockResolvedValue({
        id: 'ann-1',
        title: 'old',
        body: 'old',
        createdBy: 'admin-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      repo.save.mockImplementation((a: Announcement) => Promise.resolve(a));

      const res = await service.update(admin, 'ann-1', { title: 'new' });

      expect(res.data.title).toBe('new');
      expect(res.data.body).toBe('old'); // untouched when omitted
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AdminAuditAction.ANNOUNCEMENT_UPDATED,
          targetId: 'ann-1',
        }),
      );
    });

    it('AC-ANN-4: update on a missing/deleted id → 404', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.update(admin, 'missing', { title: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('AC-ANN-5: soft-deletes an existing announcement', async () => {
      repo.softDelete.mockResolvedValue({ affected: 1 });

      const res = await service.remove(admin, 'ann-1');

      expect(repo.softDelete).toHaveBeenCalledWith({ id: 'ann-1' });
      expect(res.data.id).toBe('ann-1');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AdminAuditAction.ANNOUNCEMENT_DELETED,
          targetId: 'ann-1',
        }),
      );
    });

    it('AC-ANN-6: delete on a missing/already-deleted id → 404', async () => {
      repo.softDelete.mockResolvedValue({ affected: 0 });
      await expect(service.remove(admin, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(audit.record).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('AC-ANN-7: returns a paginated envelope of non-deleted rows', async () => {
      const rows = [
        {
          id: 'ann-2',
          title: 'b',
          body: 'b',
          createdBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      ];
      const qb: any = {
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([rows, 1]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      const res = await service.list(admin, {
        limit: 20,
        offset: 0,
        search: '',
        order: { createdAt: 'DESC' },
      });

      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(res.data.total).toBe(1);
      expect(res.data.items).toHaveLength(1);
      expect(res.data.items[0].id).toBe('ann-2');
    });

    it('AC-ANN-7b: applies search + whitelisted ASC sort, ignores unknown keys', async () => {
      const qb: any = {
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      repo.createQueryBuilder.mockReturnValue(qb);

      await service.list(admin, {
        limit: 10,
        offset: 5,
        search: 'Exam',
        // 'title' is whitelisted (ASC); 'evil' is ignored (no fallback needed)
        order: { title: 'ASC', evil: 'DESC' },
      });

      expect(qb.addOrderBy).toHaveBeenCalledWith('announcement.title', 'ASC');
      expect(qb.addOrderBy).not.toHaveBeenCalledWith(
        'announcement.evil',
        expect.anything(),
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(announcement.title) LIKE :search'),
        { search: '%exam%' },
      );
    });
  });

  describe('findOne', () => {
    it('AC-ANN-8: returns a non-deleted announcement by id', async () => {
      repo.findOne.mockResolvedValue({
        id: 'ann-1',
        title: 't',
        body: 'b',
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      const res = await service.findOne(admin, 'ann-1');
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'ann-1' } });
      expect(res.data.id).toBe('ann-1');
    });

    it('AC-ANN-8b: 404 when the announcement is missing or soft-deleted', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.findOne(admin, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

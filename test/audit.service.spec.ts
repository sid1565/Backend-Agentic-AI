import { AuditService } from '../src/modules/admin/audit/audit.service';
import { AdminAuditAction } from '../src/modules/admin/audit/admin-audit-log.entity';

/**
 * Unit tests for AuditService. Verifies write-through and that audit failures
 * are swallowed (an audit write must never break the business operation).
 */
describe('AuditService', () => {
  let repo: any;
  let service: AuditService;

  beforeEach(() => {
    repo = {
      create: jest.fn((x) => x),
      save: jest.fn().mockResolvedValue(undefined),
      findAndCount: jest.fn(),
    };
    const i18n = { t: (k: string) => k } as any;
    service = new AuditService(repo, i18n);
  });

  it('AC-AUD-1: persists an audit record', async () => {
    await service.record({
      actorId: 'admin-1',
      action: AdminAuditAction.SCHOOL_CREATED,
      targetId: 'school-1',
    });
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('AC-AUD-2: swallows persistence errors (never throws)', async () => {
    repo.save.mockRejectedValue(new Error('db down'));
    await expect(
      service.record({
        actorId: null,
        action: AdminAuditAction.SUBSCRIPTION_EXPIRED,
      }),
    ).resolves.toBeUndefined();
  });

  it('AC-AUD-3: returns a paginated envelope', async () => {
    repo.findAndCount.mockResolvedValue([[{ id: '1' }], 1]);
    const res = await service.list(
      { id: 'admin-1', role: 'ADMIN' },
      { limit: 20, offset: 0, search: '', order: { createdAt: 'DESC' } } as any,
    );
    expect(res.data).toEqual(
      expect.objectContaining({ total: 1, limit: 20, offset: 0 }),
    );
    expect(res.data.items).toHaveLength(1);
  });
});

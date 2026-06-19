import { ConfigService } from '@nestjs/config';
import { AdminSeeder } from '../src/modules/auth/admin-seeder.service';
import { AdminStatus } from '../src/modules/auth/entities/admin-user.entity';

/**
 * Unit tests for the root-admin bootstrap. Verifies idempotency and the
 * skip-on-missing-config guard.
 */
describe('AdminSeeder', () => {
  let admins: any;
  let config: any;
  let seeder: AdminSeeder;

  beforeEach(() => {
    admins = {
      findOne: jest.fn(),
      insert: jest.fn().mockResolvedValue(undefined),
    };
    config = new ConfigService();
    jest.spyOn(config, 'get').mockImplementation((key: any) => {
      const map: Record<string, unknown> = {
        'adminSeed.email': 'root@x.io',
        'adminSeed.password': 'StrongPw!1',
        'auth.bcryptSaltRounds': 4,
      };
      return map[key];
    });
    seeder = new AdminSeeder(admins, config);
  });

  it('AC-SEED-1: seeds a root admin when none exists', async () => {
    admins.findOne.mockResolvedValue(null);
    await seeder.onModuleInit();
    expect(admins.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'root@x.io',
        status: AdminStatus.ACTIVE,
        password: expect.any(String),
      }),
    );
  });

  it('AC-SEED-2: is idempotent — does not insert when admin already exists', async () => {
    admins.findOne.mockResolvedValue({ id: 'existing' });
    await seeder.onModuleInit();
    expect(admins.insert).not.toHaveBeenCalled();
  });

  it('AC-SEED-3: skips seeding when seed config is missing', async () => {
    jest.spyOn(config, 'get').mockReturnValue(undefined);
    await seeder.onModuleInit();
    expect(admins.findOne).not.toHaveBeenCalled();
    expect(admins.insert).not.toHaveBeenCalled();
  });
});

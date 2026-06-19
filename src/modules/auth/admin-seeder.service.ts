import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AdminStatus, AdminUser } from './entities/admin-user.entity';

/**
 * Bootstraps a single root admin on startup so the system is never locked out
 * with zero admins. Idempotent: if an admin with the seed email already
 * exists, nothing is created. The seed password should be supplied via
 * ROOT_ADMIN_PASSWORD and rotated after first login.
 */
@Injectable()
export class AdminSeeder implements OnModuleInit {
  private readonly logger = new Logger(AdminSeeder.name);

  constructor(
    @InjectRepository(AdminUser)
    private readonly admins: Repository<AdminUser>,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const email = (
      this.config.get<string>('adminSeed.email') ?? ''
    ).toLowerCase();
    const password = this.config.get<string>('adminSeed.password');
    if (!email || !password) {
      this.logger.warn('Root admin seed skipped: missing email/password');
      return;
    }

    const existing = await this.admins.findOne({ where: { email } });
    if (existing) return;

    const rounds = this.config.get<number>('auth.bcryptSaltRounds') ?? 12;
    await this.admins.insert({
      email,
      name: 'Root Admin',
      password: await bcrypt.hash(password, rounds),
      status: AdminStatus.ACTIVE,
    });
    this.logger.log(`Seeded root admin email=${email}`);
  }
}

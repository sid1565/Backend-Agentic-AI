import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import {
  Subscription,
  SubscriptionStatus,
} from '../entities/subscription.entity';
import { AuditService } from '../../admin/audit/audit.service';
import { AdminAuditAction } from '../../admin/audit/admin-audit-log.entity';

@Injectable()
export class SubscriptionExpiryJob {
  private readonly logger = new Logger(SubscriptionExpiryJob.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly repo: Repository<Subscription>,
    private readonly audit: AuditService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async expire(): Promise<void> {
    const today = new Date().toISOString().substring(0, 10);
    const expiring = await this.repo.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: LessThan(today),
      },
      select: { id: true, schoolId: true },
    });
    if (expiring.length === 0) return;

    const ids = expiring.map((s) => s.id);
    await this.repo
      .createQueryBuilder()
      .update(Subscription)
      .set({ status: SubscriptionStatus.EXPIRED })
      .whereInIds(ids)
      .execute();

    for (const sub of expiring) {
      await this.audit.record({
        actorId: null,
        action: AdminAuditAction.SUBSCRIPTION_EXPIRED,
        targetId: sub.schoolId,
        metadata: { subscriptionId: sub.id },
      });
    }

    this.logger.log(`Expired ${expiring.length} subscription(s)`);
  }
}

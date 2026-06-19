import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionExpiryJob } from './jobs/subscription-expiry.job';
import { AuditModule } from '../admin/audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription]), AuditModule],
  providers: [SubscriptionExpiryJob],
  exports: [TypeOrmModule],
})
export class SubscriptionsModule {}

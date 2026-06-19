import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuditLog } from './admin-audit-log.entity';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { SectionGuard } from '../../../common/guards/section.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AdminAuditLog])],
  controllers: [AuditController],
  providers: [AuditService, SectionGuard],
  exports: [AuditService],
})
export class AuditModule {}

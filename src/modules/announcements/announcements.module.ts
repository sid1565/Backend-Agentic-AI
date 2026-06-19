import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Announcement } from './entities/announcement.entity';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsAdminController } from './announcements.admin.controller';
import { AnnouncementsController } from './announcements.controller';
import { AuditModule } from '../admin/audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { SectionGuard } from '../../common/guards/section.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Announcement]),
    AuditModule,
    AuthModule,
  ],
  controllers: [AnnouncementsAdminController, AnnouncementsController],
  providers: [AnnouncementsService, SectionGuard],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}

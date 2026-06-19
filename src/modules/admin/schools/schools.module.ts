import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { School } from './entities/school.entity';
import { Subscription } from '../../subscriptions/entities/subscription.entity';
import { SchoolsService } from './schools.service';
import { SchoolsController } from './schools.controller';
import { MailModule } from '../../mail/mail.module';
import { PdfModule } from '../../pdf/pdf.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../../auth/auth.module';
import { SectionGuard } from '../../../common/guards/section.guard';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([School, Subscription]),
    MailModule,
    PdfModule,
    AuditModule,
    AuthModule,
  ],
  controllers: [SchoolsController],
  providers: [SchoolsService, SectionGuard],
  exports: [SchoolsService],
})
export class SchoolsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { AuthModule } from '../auth/auth.module';
import { School } from '../admin/schools/entities/school.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { SectionGuard } from '../../common/guards/section.guard';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([School, Subscription])],
  controllers: [MeController],
  providers: [MeService, SectionGuard],
})
export class MeModule {}

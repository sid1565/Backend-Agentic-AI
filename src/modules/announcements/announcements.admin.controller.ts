import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserAuthGuard } from '../../common/guards/user-auth.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { Section } from '../../common/decorators/section.decorator';
import { EAdminModule } from '../../common/enums/admin-module.enum';
import {
  CurrentUser,
  User,
} from '../../common/decorators/current-user.decorator';
import { UUIDValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ResponseHelper } from '../../common/helpers/response.helper';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementResponseDto } from './dto/announcement-response.dto';
import { AnnouncementsService } from './announcements.service';

/**
 * Admin-only writes. Every route requires the ANNOUNCEMENT_MANAGEMENT section,
 * which the role/scope taxonomy grants to ADMIN only — SCHOOL principals are
 * rejected with 403 by SectionGuard, unauthenticated requests with 401 by
 * UserAuthGuard.
 */
@ApiTags('Admin / Announcements')
@ApiBearerAuth()
@Controller({ path: 'admin/announcements', version: '1' })
@UseGuards(UserAuthGuard, SectionGuard)
export class AnnouncementsAdminController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a school-wide announcement' })
  @ApiResponse({ type: AnnouncementResponseDto })
  @Section(EAdminModule.ANNOUNCEMENT_MANAGEMENT)
  async create(@CurrentUser() user: User, @Body() dto: CreateAnnouncementDto) {
    const result = await this.announcements.create(user, dto);
    return ResponseHelper.success(result.message, result.data);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an announcement' })
  @ApiResponse({ type: AnnouncementResponseDto })
  @Section(EAdminModule.ANNOUNCEMENT_MANAGEMENT)
  async update(
    @CurrentUser() user: User,
    @Param('id', UUIDValidationPipe) id: string,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    const result = await this.announcements.update(user, id, dto);
    return ResponseHelper.success(result.message, result.data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete an announcement' })
  @Section(EAdminModule.ANNOUNCEMENT_MANAGEMENT)
  async remove(
    @CurrentUser() user: User,
    @Param('id', UUIDValidationPipe) id: string,
  ) {
    const result = await this.announcements.remove(user, id);
    return ResponseHelper.success(result.message, result.data);
  }
}

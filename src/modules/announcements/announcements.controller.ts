import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserAuthGuard } from '../../common/guards/user-auth.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import {
  CurrentUser,
  User,
} from '../../common/decorators/current-user.decorator';
import { UUIDValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ResponseHelper } from '../../common/helpers/response.helper';
import { ListAnnouncementsQueryDto } from './dto/list-announcements-query.dto';
import { AnnouncementsService } from './announcements.service';

/**
 * Reads for any authenticated principal. UserAuthGuard requires a valid token
 * (401 otherwise); no `@Section` is applied, so SectionGuard short-circuits to
 * allow — both ADMIN and SCHOOL roles can list/read school-wide announcements.
 */
@ApiTags('Announcements')
@ApiBearerAuth()
@Controller({ path: 'announcements', version: '1' })
@UseGuards(UserAuthGuard, SectionGuard)
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Get()
  @ApiOperation({ summary: 'List announcements (paginated, newest first)' })
  async list(
    @CurrentUser() user: User,
    @Query() query: ListAnnouncementsQueryDto,
  ) {
    const result = await this.announcements.list(user, query);
    const { items, total, limit, offset } = result.data;
    return ResponseHelper.paginatedSuccess(
      result.message,
      { limit, offset, total },
      items,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single announcement by id' })
  async getOne(
    @CurrentUser() user: User,
    @Param('id', UUIDValidationPipe) id: string,
  ) {
    const result = await this.announcements.findOne(user, id);
    return ResponseHelper.success(result.message, result.data);
  }
}

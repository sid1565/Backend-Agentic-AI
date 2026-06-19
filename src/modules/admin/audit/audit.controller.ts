import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserAuthGuard } from '../../../common/guards/user-auth.guard';
import { SectionGuard } from '../../../common/guards/section.guard';
import { Section } from '../../../common/decorators/section.decorator';
import { EAdminModule } from '../../../common/enums/admin-module.enum';
import {
  CurrentUser,
  User,
} from '../../../common/decorators/current-user.decorator';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import { ListAuditQueryDto } from './dto/list-audit-query.dto';
import { AuditService } from './audit.service';

@ApiTags('Admin / Audit Logs')
@ApiBearerAuth()
@Controller({ path: 'admin/audit-logs', version: '1' })
@UseGuards(UserAuthGuard, SectionGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List admin audit logs' })
  @Section(EAdminModule.AUDIT_LOGS)
  async list(
    @CurrentUser() user: User,
    @Query() query: ListAuditQueryDto,
  ) {
    const result = await this.audit.list(user, query);
    const { items, total, limit, offset } = result.data;
    return ResponseHelper.paginatedSuccess(
      result.message,
      { limit, offset, total },
      items,
    );
  }
}

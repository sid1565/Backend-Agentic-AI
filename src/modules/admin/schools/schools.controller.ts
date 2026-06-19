import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserAuthGuard } from '../../../common/guards/user-auth.guard';
import { SectionGuard } from '../../../common/guards/section.guard';
import { Section } from '../../../common/decorators/section.decorator';
import { EAdminModule } from '../../../common/enums/admin-module.enum';
import {
  CurrentUser,
  User,
} from '../../../common/decorators/current-user.decorator';
import { UUIDValidationPipe } from '../../../common/pipes/uuid-validation.pipe';
import { ResponseHelper } from '../../../common/helpers/response.helper';
import { CreateSchoolDto } from './dto/create-school.dto';
import { ListSchoolsQueryDto } from './dto/list-schools-query.dto';
import { SchoolResponseDto } from './dto/school-response.dto';
import { SchoolsService } from './schools.service';

@ApiTags('Admin / Schools')
@ApiBearerAuth()
@Controller({ path: 'admin/schools', version: '1' })
@UseGuards(UserAuthGuard, SectionGuard)
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a school with an initial subscription' })
  @ApiResponse({ type: SchoolResponseDto })
  @Section(EAdminModule.SCHOOL_MANAGEMENT)
  async create(@CurrentUser() user: User, @Body() dto: CreateSchoolDto) {
    const result = await this.schoolsService.create(user, dto);
    return ResponseHelper.success(result.message, result.data);
  }

  @Get()
  @ApiOperation({ summary: 'List schools with filters and pagination' })
  @Section(EAdminModule.SCHOOL_MANAGEMENT)
  async list(
    @CurrentUser() user: User,
    @Query() query: ListSchoolsQueryDto,
  ) {
    const result = await this.schoolsService.list(user, query);
    const { items, total, limit, offset } = result.data;
    return ResponseHelper.paginatedSuccess(
      result.message,
      { limit, offset, total },
      items,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a school by id' })
  @ApiResponse({ type: SchoolResponseDto })
  @Section(EAdminModule.SCHOOL_MANAGEMENT)
  async getOne(
    @CurrentUser() user: User,
    @Param('id', UUIDValidationPipe) id: string,
  ) {
    const result = await this.schoolsService.findOne(user, id);
    return ResponseHelper.success(result.message, result.data);
  }

  @Post(':id/resend-credentials')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend login credentials to a school' })
  @Section(EAdminModule.SCHOOL_MANAGEMENT)
  async resend(
    @CurrentUser() user: User,
    @Param('id', UUIDValidationPipe) id: string,
  ) {
    const result = await this.schoolsService.resendCredentials(user, id);
    return ResponseHelper.success(result.message, result.data);
  }

  @Get(':id/subscriptions')
  @ApiOperation({ summary: "List a school's subscription history" })
  @Section(EAdminModule.SUBSCRIPTION_MANAGEMENT)
  async listSubscriptions(
    @CurrentUser() user: User,
    @Param('id', UUIDValidationPipe) id: string,
  ) {
    const result = await this.schoolsService.listSubscriptions(user, id);
    return ResponseHelper.success(result.message, result.data);
  }
}

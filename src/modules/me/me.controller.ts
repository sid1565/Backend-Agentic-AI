import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserAuthGuard } from '../../common/guards/user-auth.guard';
import { SectionGuard } from '../../common/guards/section.guard';
import { Section } from '../../common/decorators/section.decorator';
import { EUserModule } from '../../common/enums/admin-module.enum';
import {
  CurrentUser,
  User,
} from '../../common/decorators/current-user.decorator';
import { ResponseHelper } from '../../common/helpers/response.helper';
import { MeService } from './me.service';

@ApiTags('Me')
@ApiBearerAuth()
@Controller({ path: 'me', version: '1' })
@UseGuards(UserAuthGuard, SectionGuard)
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get('school')
  @ApiOperation({ summary: "Get the authenticated school's own profile" })
  @Section(EUserModule.PROFILE)
  async getSchool(@CurrentUser() user: User) {
    const result = await this.me.getOwnSchool(user);
    return ResponseHelper.success(result.message, result.data);
  }

  @Get('subscription')
  @ApiOperation({ summary: "Get the authenticated school's latest subscription" })
  @Section(EUserModule.PROFILE)
  async getSubscription(@CurrentUser() user: User) {
    const result = await this.me.getOwnSubscription(user);
    return ResponseHelper.success(result.message, result.data);
  }
}

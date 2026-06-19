import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserAuthGuard } from '../../common/guards/user-auth.guard';
import {
  CurrentUser,
  User,
} from '../../common/decorators/current-user.decorator';
import { ResponseHelper } from '../../common/helpers/response.helper';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Admin login" })
  async adminLogin(@Body() dto: LoginDto) {
    const result = await this.auth.adminLogin(dto);
    return ResponseHelper.success(result.message, result.data);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('school/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "School login" })
  async schoolLogin(@Body() dto: LoginDto) {
    const result = await this.auth.schoolLogin(dto);
    return ResponseHelper.success(result.message, result.data);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rotate refresh token" })
  async refresh(@Body() dto: RefreshDto) {
    const result = await this.auth.refresh(dto);
    return ResponseHelper.success(result.message, result.data);
  }

  @UseGuards(UserAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout (revoke refresh tokens)" })
  async logout(@CurrentUser() user: User) {
    const result = await this.auth.logout(user);
    return ResponseHelper.success(result.message, result.data);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request password reset email" })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.auth.forgotPassword(dto);
    return ResponseHelper.success(result.message, result.data);
  }

  // Unauthenticated by design: the caller proves identity with the emailed
  // reset token, not a bearer JWT, so no UserAuthGuard is applied. Throttled
  // tightly to blunt brute-forcing of the reset token.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset password using reset token" })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const result = await this.auth.resetPassword(dto);
    return ResponseHelper.success(result.message, result.data);
  }
}

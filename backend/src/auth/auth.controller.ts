import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentStaff } from '../common/decorators/current-staff.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthenticatedStaff } from './auth.types';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordRequestDto } from './dto/forgot-password-request.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOkResponse({ description: 'Current authenticated staff' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentStaff() staff: AuthenticatedStaff) {
    return staff;
  }

  @ApiOkResponse({ description: 'Password changed successfully' })
  @ApiUnauthorizedResponse({ description: 'Current password is incorrect' })
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  async changePassword(
    @CurrentStaff() staff: AuthenticatedStaff,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      staff.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  @ApiOkResponse({ description: 'OTP sent if the account exists' })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password/request')
  async requestPasswordReset(@Body() dto: ForgotPasswordRequestDto) {
    await this.passwordResetService.requestOtp(dto.email);
    return { message: 'If the account exists, an OTP has been sent' };
  }

  @ApiOkResponse({ description: 'OTP is valid' })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password/verify')
  async verifyPasswordResetOtp(@Body() dto: VerifyOtpDto) {
    await this.passwordResetService.verifyOtp(dto.email, dto.otp);
    return { message: 'OTP is valid' };
  }

  @ApiOkResponse({ description: 'Password reset successfully' })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password/reset')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.passwordResetService.resetPassword(
      dto.email,
      dto.otp,
      dto.newPassword,
    );
    return { message: 'Password reset successfully' };
  }
}

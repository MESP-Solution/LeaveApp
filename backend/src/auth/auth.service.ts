import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Staff } from '../database/entities/staff.entity';
import { StaffsService } from '../staffs/staffs.service';
import { AuthenticatedStaff, JwtPayload } from './auth.types';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly staffsService: StaffsService,
  ) {}

  async login(dto: LoginDto) {
    const staff = await this.staffsService.findByEmailWithPassword(dto.email);
    if (!staff || !(await bcrypt.compare(dto.password, staff.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createAuthResponse(staff);
  }

  /**
   * Self-service password change for a logged-in staff member. Verifies the
   * current password (bcrypt) before applying the new one. No OTP involved.
   */
  async changePassword(
    staffId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const staff = await this.staffsService.findEntityById(staffId);
    if (!(await bcrypt.compare(currentPassword, staff.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.staffsService.updatePassword(staffId, newPassword);
  }

  createAuthResponse(staff: Staff) {
    const safeStaff = this.toAuthenticatedStaff(staff);
    const payload: JwtPayload = {
      email: safeStaff.email,
      role: safeStaff.role,
      sub: safeStaff.id,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      staff: safeStaff,
    };
  }

  toAuthenticatedStaff(staff: Staff): AuthenticatedStaff {
    return {
      email: staff.email,
      fullName: staff.fullName,
      id: staff.id,
      leaveCredit: Number(staff.leaveCredit),
      role: staff.role.name,
      departmentId: staff.department?.id ?? null,
      department: staff.department?.name ?? null,
    };
  }
}

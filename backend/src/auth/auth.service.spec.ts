import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '../database/entities/role.entity';
import { Staff } from '../database/entities/staff.entity';
import { StaffsService } from '../staffs/staffs.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let jwtService: Pick<JwtService, 'sign'>;
  let staffsService: Pick<StaffsService, 'findByEmailWithPassword'>;

  beforeEach(() => {
    jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
    };
    staffsService = {
      findByEmailWithPassword: jest.fn(),
    };

    authService = new AuthService(
      jwtService as JwtService,
      staffsService as StaffsService,
    );
  });

  it('returns token and safe staff for valid credentials', async () => {
    const staff = await createStaff('12345678');
    jest
      .spyOn(staffsService, 'findByEmailWithPassword')
      .mockResolvedValue(staff);

    const response = await authService.login({
      email: 'an@company.local',
      password: '12345678',
    });

    expect(response).toEqual({
      accessToken: 'signed-token',
      staff: {
        email: 'an@company.local',
        fullName: 'Nguyễn Văn An',
        id: 1,
        leaveCredit: 12,
        role: 'STAFF',
      },
    });
    expect(response).not.toHaveProperty('passwordHash');
  });

  it('rejects invalid password with generic error', async () => {
    const staff = await createStaff('12345678');
    jest
      .spyOn(staffsService, 'findByEmailWithPassword')
      .mockResolvedValue(staff);

    await expect(
      authService.login({
        email: 'an@company.local',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

async function createStaff(password: string): Promise<Staff> {
  const role = new Role();
  role.id = 1;
  role.name = 'STAFF';

  const staff = new Staff();
  staff.id = 1;
  staff.fullName = 'Nguyễn Văn An';
  staff.email = 'an@company.local';
  staff.passwordHash = await bcrypt.hash(password, 4);
  staff.smtpPass = 'smtp-pass-1';
  staff.role = role;
  staff.leaveCredit = 12;
  staff.createdAt = new Date();
  staff.updatedAt = new Date();

  return staff;
}

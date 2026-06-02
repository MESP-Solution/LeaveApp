import { EntityManager } from '@mikro-orm/core';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PasswordResetOtp } from '../database/entities/password-reset-otp.entity';
import { Role } from '../database/entities/role.entity';
import { Staff } from '../database/entities/staff.entity';
import { MailService } from '../mail/mail.service';
import { StaffsService } from '../staffs/staffs.service';
import { PasswordResetService } from './password-reset.service';

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let em: jest.Mocked<
    Pick<
      EntityManager,
      'nativeUpdate' | 'create' | 'persistAndFlush' | 'findOne' | 'flush'
    >
  >;
  let staffsService: jest.Mocked<
    Pick<StaffsService, 'findByEmailWithPassword' | 'updatePassword'>
  >;
  let mailService: jest.Mocked<Pick<MailService, 'sendWithAppResend'>>;

  beforeEach(() => {
    em = {
      nativeUpdate: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation((_entity, data) => data),
      persistAndFlush: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
    } as unknown as typeof em;
    staffsService = {
      findByEmailWithPassword: jest.fn(),
      updatePassword: jest.fn().mockResolvedValue(undefined),
    } as unknown as typeof staffsService;
    mailService = {
      sendWithAppResend: jest.fn().mockResolvedValue(undefined),
    } as unknown as typeof mailService;

    const config = { get: jest.fn().mockReturnValue(undefined) };

    service = new PasswordResetService(
      em as unknown as EntityManager,
      staffsService as unknown as StaffsService,
      mailService as unknown as MailService,
      config as unknown as ConfigService,
    );
  });

  describe('requestOtp', () => {
    it('sends an OTP email when the account exists', async () => {
      staffsService.findByEmailWithPassword.mockResolvedValue(makeStaff());

      await service.requestOtp('an@company.local');

      expect(em.persistAndFlush).toHaveBeenCalledTimes(1);
      expect(mailService.sendWithAppResend).toHaveBeenCalledTimes(1);
    });

    it('does nothing (no email) when the account does not exist', async () => {
      staffsService.findByEmailWithPassword.mockResolvedValue(null);

      await service.requestOtp('missing@company.local');

      expect(em.persistAndFlush).not.toHaveBeenCalled();
      expect(mailService.sendWithAppResend).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('sets the new password for a valid OTP', async () => {
      const otp = '123456';
      em.findOne.mockResolvedValue(
        makeOtpRecord({ otpHash: await bcrypt.hash(otp, 4) }),
      );
      staffsService.findByEmailWithPassword.mockResolvedValue(makeStaff());

      await service.resetPassword('an@company.local', otp, 'newPassword123');

      expect(staffsService.updatePassword).toHaveBeenCalledWith(
        1,
        'newPassword123',
      );
    });

    it('rejects an expired OTP', async () => {
      em.findOne.mockResolvedValue(
        makeOtpRecord({
          otpHash: await bcrypt.hash('123456', 4),
          expiresAt: new Date(Date.now() - 60_000),
        }),
      );

      await expect(
        service.resetPassword('an@company.local', '123456', 'newPassword123'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(staffsService.updatePassword).not.toHaveBeenCalled();
    });

    it('rejects a wrong OTP and increments attempts', async () => {
      const record = makeOtpRecord({ otpHash: await bcrypt.hash('123456', 4) });
      em.findOne.mockResolvedValue(record);

      await expect(
        service.resetPassword('an@company.local', '000000', 'newPassword123'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(record.attempts).toBe(1);
      expect(staffsService.updatePassword).not.toHaveBeenCalled();
    });
  });
});

function makeOtpRecord(
  overrides: Partial<PasswordResetOtp> = {},
): PasswordResetOtp {
  return {
    id: 1,
    email: 'an@company.local',
    otpHash: 'hash',
    expiresAt: new Date(Date.now() + 60_000),
    consumedAt: null,
    attempts: 0,
    createdAt: new Date(),
    ...overrides,
  } as PasswordResetOtp;
}

function makeStaff(): Staff {
  const role = new Role();
  role.id = 1;
  role.name = 'STAFF';

  const staff = new Staff();
  staff.id = 1;
  staff.fullName = 'Nguyễn Văn An';
  staff.email = 'an@company.local';
  staff.passwordHash = 'hash';
  staff.role = role;
  staff.leaveCredit = 12;
  staff.createdAt = new Date();
  staff.updatedAt = new Date();

  return staff;
}

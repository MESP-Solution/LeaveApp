import { randomInt } from 'crypto';
import { EntityManager } from '@mikro-orm/core';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PasswordResetOtp } from '../database/entities/password-reset-otp.entity';
import { otpPasswordResetHtml } from '../mail/email-templates';
import { MailService } from '../mail/mail.service';
import { StaffsService } from '../staffs/staffs.service';

const OTP_LENGTH = 6;
const DEFAULT_EXPIRES_MINUTES = 10;
const DEFAULT_MAX_ATTEMPTS = 5;

/**
 * Public "forgot password" OTP flow. OTPs are stored hashed (bcrypt) and looked
 * up by email so the endpoints never reveal whether an account exists.
 */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly expiresMinutes: number;
  private readonly maxAttempts: number;

  constructor(
    private readonly em: EntityManager,
    private readonly staffsService: StaffsService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    this.expiresMinutes =
      Number(this.configService.get<string>('OTP_EXPIRES_MINUTES')) ||
      DEFAULT_EXPIRES_MINUTES;
    this.maxAttempts =
      Number(this.configService.get<string>('OTP_MAX_ATTEMPTS')) ||
      DEFAULT_MAX_ATTEMPTS;
  }

  /**
   * Issues an OTP for the email and sends it. Always resolves silently even if
   * the account does not exist, to avoid user enumeration.
   */
  async requestOtp(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const staff = await this.staffsService.findByEmailWithPassword(email);
    if (!staff) {
      return;
    }

    // Invalidate any still-valid OTPs for this email so only the newest works.
    await this.em.nativeUpdate(
      PasswordResetOtp,
      { email: normalizedEmail, consumedAt: null },
      { consumedAt: new Date() },
    );

    const otp = this.generateOtp();
    const record = this.em.create(PasswordResetOtp, {
      email: normalizedEmail,
      otpHash: await bcrypt.hash(otp, 10),
      expiresAt: new Date(Date.now() + this.expiresMinutes * 60_000),
      consumedAt: null,
      attempts: 0,
      createdAt: new Date(),
    });
    await this.em.persistAndFlush(record);

    await this.mailService.sendWithAppResend({
      to: staff.email,
      subject: 'Mã OTP đặt lại mật khẩu',
      text: `Mã OTP đặt lại mật khẩu của bạn là ${otp}. Mã có hiệu lực trong ${this.expiresMinutes} phút.`,
      html: otpPasswordResetHtml({
        fullName: staff.fullName,
        otp,
        expiresInMinutes: this.expiresMinutes,
      }),
    });
  }

  /** Validates an OTP without consuming it. Throws on any failure. */
  async verifyOtp(email: string, otp: string): Promise<void> {
    await this.assertValidOtp(email, otp);
  }

  /** Validates the OTP, marks it consumed, and sets the new password. */
  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<void> {
    const record = await this.assertValidOtp(email, otp);
    record.consumedAt = new Date();

    const staff = await this.staffsService.findByEmailWithPassword(email);
    if (!staff) {
      // Should not happen (OTP existed for this email) but guard anyway.
      await this.em.flush();
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.staffsService.updatePassword(staff.id, newPassword);
    await this.em.flush();
  }

  /**
   * Loads the newest unconsumed OTP for the email and checks expiry, attempt
   * count, and hash. Increments attempts on a wrong code. Returns the record
   * (not yet consumed) on success.
   */
  private async assertValidOtp(
    email: string,
    otp: string,
  ): Promise<PasswordResetOtp> {
    const normalizedEmail = email.trim().toLowerCase();
    const record = await this.em.findOne(
      PasswordResetOtp,
      { email: normalizedEmail, consumedAt: null },
      { orderBy: { createdAt: 'DESC' } },
    );

    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (record.attempts >= this.maxAttempts) {
      record.consumedAt = new Date();
      await this.em.flush();
      throw new BadRequestException('Too many attempts');
    }

    const matches = await bcrypt.compare(otp, record.otpHash);
    if (!matches) {
      record.attempts += 1;
      await this.em.flush();
      throw new BadRequestException('Invalid or expired OTP');
    }

    return record;
  }

  private generateOtp(): string {
    return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
  }
}

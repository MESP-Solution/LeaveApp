import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

/**
 * One-time password issued for the public "forgot password" flow.
 *
 * Stores only the bcrypt HASH of the OTP (never the plain code). Records are
 * looked up by email (no hard FK to staffs) so the flow does not leak whether
 * an account exists. `attempts` guards against brute-forcing the code, and
 * `consumedAt` marks an OTP that has already been used to reset a password.
 */
@Entity({ tableName: 'password_reset_otps' })
export class PasswordResetOtp {
  @PrimaryKey({ autoincrement: true, columnType: 'int unsigned' })
  id!: number;

  @Property({ length: 255 })
  email!: string;

  @Property({ length: 255 })
  otpHash!: string;

  @Property({ type: 'datetime', length: 3 })
  expiresAt!: Date;

  @Property({ type: 'datetime', length: 3, nullable: true })
  consumedAt?: Date | null;

  @Property({ default: 0 })
  attempts!: number;

  @Property({ type: 'datetime', length: 3, defaultRaw: 'current_timestamp(3)' })
  createdAt!: Date;
}

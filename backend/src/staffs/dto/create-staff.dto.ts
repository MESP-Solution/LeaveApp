import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  fullName!: string;

  @ApiProperty({ example: 'a@company.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongP@ssw0rd' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'smtp-app-password-1234' })
  @IsString()
  @MinLength(8)
  smtpPass!: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Role id. Defaults to STAFF.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  roleId?: number;

  @ApiPropertyOptional({ example: 12, default: 12 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  leaveCredit?: number;
}

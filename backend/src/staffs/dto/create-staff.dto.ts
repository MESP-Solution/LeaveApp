import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  fullName!: string;

  @ApiProperty({ example: 'a@company.local' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 1, description: 'Role id. Defaults to STAFF.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  roleId?: number;

  @ApiPropertyOptional({ example: 12, default: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  leaveCredit?: number;
}


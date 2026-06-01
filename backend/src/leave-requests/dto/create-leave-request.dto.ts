import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TypeLeave } from '../../database/enums/type-leave.enum';

export class CreateLeaveRequestDto {
  @ApiPropertyOptional({
    example: 1,
    description:
      'Ignored by the server: a leave request is always created for the authenticated staff.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  staffId?: number;

  @ApiProperty({ example: '2026-05-04' })
  @IsDateString()
  leaveDate!: string;

  @ApiProperty({
    enum: TypeLeave,
    example: TypeLeave.FULL,
    default: TypeLeave.FULL,
  })
  @IsEnum(TypeLeave)
  type: TypeLeave = TypeLeave.FULL;

  @ApiProperty({ example: 'Family trip' })
  @IsString()
  reason!: string;
}

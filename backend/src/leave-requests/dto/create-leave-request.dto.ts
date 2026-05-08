import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsString, Min } from 'class-validator';
import { TypeLeave } from '../../database/enums/type-leave.enum';

export class CreateLeaveRequestDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  staffId!: number;

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

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  LEAVE_REQUEST_STATUSES,
  type LeaveRequestStatus,
} from '../leave-request.model';
import { TypeLeave } from '../../database/enums/type-leave.enum';

class LeaveRequestUserDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Nguyen Van A' })
  fullName!: string;

  @ApiProperty({ example: 'a@company.local' })
  email!: string;
}

export class LeaveRequestResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  staffId!: number;

  @ApiProperty({ example: 'Nguyen Van A' })
  staffName!: string;

  @ApiProperty({ example: 'a@company.local' })
  staffEmail!: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  employeeName!: string;

  @ApiProperty({ example: 'a@company.local' })
  employeeEmail!: string;

  @ApiProperty({ example: '2026-05-04' })
  leaveDate!: string;

  @ApiProperty({ enum: TypeLeave, example: TypeLeave.FULL })
  type!: TypeLeave;

  @ApiProperty({ example: 'Family trip' })
  reason!: string;

  @ApiProperty({ enum: LEAVE_REQUEST_STATUSES, example: 'pending' })
  status!: LeaveRequestStatus;

  @ApiPropertyOptional({ example: 'Trùng lịch họp' })
  rejectReason?: string;

  @ApiPropertyOptional({ example: 4 })
  resolvedByStaffId?: number;

  @ApiPropertyOptional({ example: '2026-05-05T10:00:00.000Z' })
  processedAt?: string;

  @ApiProperty({ example: '2026-05-05T09:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ type: LeaveRequestUserDto })
  staff!: LeaveRequestUserDto;

  @ApiPropertyOptional({ type: LeaveRequestUserDto })
  resolvedByStaff?: LeaveRequestUserDto;
}

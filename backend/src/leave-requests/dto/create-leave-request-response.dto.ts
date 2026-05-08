import { ApiProperty } from '@nestjs/swagger';
import { LeaveRequestResponseDto } from './leave-request-response.dto';

export class CreateLeaveRequestResponseDto {
  @ApiProperty({ example: 1 })
  totalDays!: number;

  @ApiProperty({
    type: LeaveRequestResponseDto,
    isArray: true,
    example: [
      {
        id: 101,
        staffId: 1,
        staffName: 'Nguyen Van An',
        staffEmail: 'an@company.local',
        employeeName: 'Nguyen Van An',
        employeeEmail: 'an@company.local',
        leaveDate: '2026-05-04',
        reason: 'Family trip',
        status: 'pending',
        createdAt: '2026-05-01T09:00:00.000Z',
        staff: { id: 1, fullName: 'Nguyen Van An', email: 'an@company.local' },
      },
    ],
  })
  requests!: LeaveRequestResponseDto[];
}

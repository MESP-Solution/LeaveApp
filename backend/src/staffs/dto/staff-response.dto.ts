import { ApiProperty } from '@nestjs/swagger';

export class StaffResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Nguyen Van A' })
  fullName!: string;

  @ApiProperty({ example: 'a@company.local' })
  email!: string;

  @ApiProperty({ example: 'STAFF' })
  role!: string;

  @ApiProperty({ example: 12 })
  leaveCredit!: number;

  @ApiProperty({ example: '2026-05-06T05:00:00.000Z' })
  createdAt!: string;
}


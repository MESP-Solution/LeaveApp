import { ApiProperty } from '@nestjs/swagger';

export class SuccessResponseDto<T = unknown> {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: 200 })
  statusCode!: number;

  @ApiProperty({ example: 'Request successful' })
  message!: string;

  @ApiProperty({ example: '2026-05-06T08:15:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/staffs' })
  path!: string;

  @ApiProperty({ nullable: true })
  data!: T;
}

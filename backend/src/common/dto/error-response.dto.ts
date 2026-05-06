import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'Bad Request' })
  error!: string;

  @ApiProperty({ example: 'Validation failed' })
  message!: string | string[];

  @ApiProperty({ example: '2026-05-06T08:15:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/staffs' })
  path!: string;

  @ApiPropertyOptional({ example: { fullName: ['fullName should not be empty'] } })
  details?: Record<string, unknown>;
}

import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'LeaveApp API' })
  app!: string;

  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: '0.1.0' })
  version!: string;
}

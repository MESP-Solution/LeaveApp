import { ApiProperty } from '@nestjs/swagger';

export class DepartmentResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'IT' })
  name!: string;

  @ApiProperty({ example: 'Information Technology', nullable: true })
  description!: string | null;
}

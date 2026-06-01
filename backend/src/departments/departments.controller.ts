import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiSuccessResponse } from '../common/swagger/api-response.decorator';
import { DepartmentResponseDto } from './dto/department-response.dto';
import { DepartmentsService } from './departments.service';

@ApiTags('departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @ApiSuccessResponse({
    description: 'Department list',
    status: 200,
    isArray: true,
    type: DepartmentResponseDto,
  })
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.departmentsService.findAll();
  }
}

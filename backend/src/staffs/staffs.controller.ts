import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../common/swagger/api-response.decorator';
import { CreateStaffDto } from './dto/create-staff.dto';
import { StaffResponseDto } from './dto/staff-response.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffsService } from './staffs.service';

@ApiTags('staffs')
@Controller('staffs')
export class StaffsController {
  constructor(private readonly staffsService: StaffsService) {}

  @ApiSuccessResponse({
    description: 'Staff list',
    status: 200,
    isArray: true,
    type: StaffResponseDto,
  })
  @Get()
  findAll() {
    return this.staffsService.findAll();
  }

  @ApiErrorResponse({ status: 404, description: 'Staff not found' })
  @ApiSuccessResponse({
    description: 'Staff detail',
    status: 200,
    type: StaffResponseDto,
  })
  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.staffsService.findById(id);
  }

  @ApiErrorResponse({ status: 409, description: 'Email already exists' })
  @ApiErrorResponse({ status: 404, description: 'Role not found' })
  @ApiSuccessResponse({
    description: 'Staff created',
    status: 201,
    type: StaffResponseDto,
  })
  @Post()
  create(@Body() dto: CreateStaffDto) {
    return this.staffsService.create(dto);
  }

  @ApiErrorResponse({ status: 409, description: 'Email already exists' })
  @ApiErrorResponse({ status: 404, description: 'Staff or role not found' })
  @ApiSuccessResponse({
    description: 'Staff updated',
    status: 200,
    type: StaffResponseDto,
  })
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStaffDto) {
    return this.staffsService.update(id, dto);
  }

  @ApiErrorResponse({ status: 404, description: 'Staff not found' })
  @ApiSuccessResponse({ description: 'Staff deleted', status: 200 })
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.staffsService.remove(id);
    return { deleted: true };
  }
}

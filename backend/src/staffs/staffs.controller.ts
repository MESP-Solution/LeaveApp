import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentStaff } from '../common/decorators/current-staff.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../common/swagger/api-response.decorator';
import type { AuthenticatedStaff } from '../auth/auth.types';
import { CreateStaffDto } from './dto/create-staff.dto';
import { RoleResponseDto } from './dto/role-response.dto';
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
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.staffsService.findAll(page, limit);
  }

  @ApiSuccessResponse({
    description: 'Role list',
    status: 200,
    isArray: true,
    type: RoleResponseDto,
  })
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @Get('roles')
  findRoles() {
    return this.staffsService.findRoles();
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
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  @Post()
  create(
    @Body() dto: CreateStaffDto,
    @CurrentStaff() currentStaff: AuthenticatedStaff,
  ) {
    return this.staffsService.create(dto, currentStaff);
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

  @ApiErrorResponse({
    status: 403,
    description: 'Cannot delete your own account',
  })
  @ApiErrorResponse({
    status: 409,
    description: 'Cannot delete an ADMIN account',
  })
  @ApiErrorResponse({
    status: 409,
    description: 'Cannot delete staff who has leave requests',
  })
  @ApiErrorResponse({
    status: 409,
    description: 'Cannot delete staff who has processed leave requests',
  })
  @ApiErrorResponse({
    status: 409,
    description: 'Cannot delete staff who created other staff records',
  })
  @ApiErrorResponse({ status: 404, description: 'Staff not found' })
  @ApiSuccessResponse({ description: 'Staff deleted', status: 200 })
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentStaff() currentStaff: AuthenticatedStaff,
  ) {
    await this.staffsService.remove(id, currentStaff.id);
    return { deleted: true };
  }
}

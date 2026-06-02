import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedStaff } from '../auth/auth.types';
import { CurrentStaff } from '../common/decorators/current-staff.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../common/swagger/api-response.decorator';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { CreateLeaveRequestResponseDto } from './dto/create-leave-request-response.dto';
import { LeaveRequestResponseDto } from './dto/leave-request-response.dto';
import { ProcessLeaveRequestDto } from './dto/process-leave-request.dto';
import {
  LEAVE_REQUEST_STATUSES,
  type LeaveRequestStatus,
} from './leave-request.model';
import { LeaveRequestsService } from './leave-requests.service';

@ApiTags('leave-requests')
@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @ApiQuery({
    name: 'status',
    enum: LEAVE_REQUEST_STATUSES,
    required: false,
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'staffId', required: false, example: 1 })
  @ApiSuccessResponse({
    description: 'Leave request list',
    status: 200,
    isArray: true,
    type: LeaveRequestResponseDto,
  })
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Query('status') status: LeaveRequestStatus | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @CurrentStaff() currentStaff: AuthenticatedStaff,
    @Query('staffId') staffIdRaw?: string,
  ) {
    const staffId = staffIdRaw ? Number(staffIdRaw) : undefined;
    const safeStaffId =
      typeof staffId === 'number' && Number.isFinite(staffId) && staffId > 0
        ? staffId
        : undefined;
    return this.leaveRequestsService.findAll(
      status,
      page,
      limit,
      currentStaff,
      safeStaffId,
    );
  }

  @ApiErrorResponse({ status: 404, description: 'Leave request not found' })
  @ApiSuccessResponse({
    description: 'Leave request detail',
    status: 200,
    type: LeaveRequestResponseDto,
  })
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentStaff() currentStaff: AuthenticatedStaff,
  ) {
    return this.leaveRequestsService.findById(id, currentStaff);
  }

  @ApiErrorResponse({
    status: 400,
    description: 'Invalid leave request payload',
  })
  @ApiErrorResponse({ status: 404, description: 'Employee not found' })
  @ApiSuccessResponse({
    description: 'Leave request created',
    status: 201,
    type: CreateLeaveRequestResponseDto,
  })
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body() dto: CreateLeaveRequestDto,
    @CurrentStaff() currentStaff: AuthenticatedStaff,
  ) {
    return this.leaveRequestsService.create(dto, currentStaff);
  }

  @ApiErrorResponse({
    status: 400,
    description: 'Invalid approval payload or processed request',
  })
  @ApiErrorResponse({
    status: 404,
    description: 'Leave request or manager not found',
  })
  @ApiSuccessResponse({
    description: 'Leave request approved',
    status: 200,
    type: LeaveRequestResponseDto,
  })
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  @Patch(':id/approve')
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProcessLeaveRequestDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.leaveRequestsService.approve(id, dto, staff.id);
  }

  @ApiErrorResponse({
    status: 400,
    description: 'Invalid rejection payload or processed request',
  })
  @ApiErrorResponse({
    status: 404,
    description: 'Leave request or manager not found',
  })
  @ApiSuccessResponse({
    description: 'Leave request rejected',
    status: 200,
    type: LeaveRequestResponseDto,
  })
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MANAGER', 'ADMIN')
  @Patch(':id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProcessLeaveRequestDto,
    @CurrentStaff() staff: AuthenticatedStaff,
  ) {
    return this.leaveRequestsService.reject(id, dto, staff.id);
  }
}

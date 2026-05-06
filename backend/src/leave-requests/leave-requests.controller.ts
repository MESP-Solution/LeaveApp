import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '../common/swagger/api-response.decorator';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
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
  @ApiSuccessResponse({
    description: 'Leave request list',
    status: 200,
    isArray: true,
    type: LeaveRequestResponseDto,
  })
  @Get()
  findAll(@Query('status') status?: LeaveRequestStatus) {
    return this.leaveRequestsService.findAll(status);
  }

  @ApiErrorResponse({ status: 404, description: 'Leave request not found' })
  @ApiSuccessResponse({
    description: 'Leave request detail',
    status: 200,
    type: LeaveRequestResponseDto,
  })
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.leaveRequestsService.findById(id);
  }

  @ApiErrorResponse({ status: 400, description: 'Invalid leave request payload' })
  @ApiErrorResponse({ status: 404, description: 'Employee not found' })
  @ApiSuccessResponse({
    description: 'Leave request created',
    status: 201,
    type: LeaveRequestResponseDto,
  })
  @Post()
  create(@Body() dto: CreateLeaveRequestDto) {
    return this.leaveRequestsService.create(dto);
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
  @Patch(':id/approve')
  approve(@Param('id') id: string, @Body() dto: ProcessLeaveRequestDto) {
    return this.leaveRequestsService.approve(id, dto);
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
  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() dto: ProcessLeaveRequestDto) {
    return this.leaveRequestsService.reject(id, dto);
  }
}

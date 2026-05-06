import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ProcessLeaveRequestDto } from './dto/process-leave-request.dto';
import { LeaveRequest, LeaveRequestStatus } from './leave-request.model';

@Injectable()
export class LeaveRequestsService {
  private readonly leaveRequests = new Map<string, LeaveRequest>();

  constructor() {}

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    const totalDays = this.calculateBusinessDays(dto.startDate, dto.endDate);

    if (!dto.reason?.trim()) {
      throw new BadRequestException('Leave reason is required');
    }

    const leaveRequest: LeaveRequest = {
      id: crypto.randomUUID(),
      employeeId: dto.employeeId,
      employeeName: dto.employeeId,
      employeeEmail: `${dto.employeeId}@example.local`,
      startDate: dto.startDate,
      endDate: dto.endDate,
      totalDays,
      reason: dto.reason.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.leaveRequests.set(leaveRequest.id, leaveRequest);
    return leaveRequest;
  }

  findAll(status?: LeaveRequestStatus): LeaveRequest[] {
    const requests = [...this.leaveRequests.values()];
    return status
      ? requests.filter((request) => request.status === status)
      : requests;
  }

  findById(id: string): LeaveRequest {
    const leaveRequest = this.leaveRequests.get(id);
    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    return leaveRequest;
  }

  async approve(
    id: string,
    dto: ProcessLeaveRequestDto,
  ): Promise<LeaveRequest> {
    return this.process(id, dto, 'approved');
  }

  async reject(id: string, dto: ProcessLeaveRequestDto): Promise<LeaveRequest> {
    return this.process(id, dto, 'rejected');
  }

  private async process(
    id: string,
    dto: ProcessLeaveRequestDto,
    status: LeaveRequestStatus,
  ): Promise<LeaveRequest> {
    const leaveRequest = this.findById(id);
    if (leaveRequest.status !== 'pending') {
      throw new BadRequestException('Leave request is already processed');
    }

    const updatedRequest: LeaveRequest = {
      ...leaveRequest,
      status,
      managerNote: dto.note?.trim(),
      processedBy: dto.managerId,
      processedAt: new Date().toISOString(),
    };

    this.leaveRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  private calculateBusinessDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start > end
    ) {
      throw new BadRequestException('Leave dates are invalid');
    }

    let businessDays = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) {
        businessDays += 1;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return businessDays;
  }
}

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
    if (!this.isValidDate(dto.leaveDate)) {
      throw new BadRequestException('Leave date is invalid');
    }
    await this.ensureNoDuplicateRequest(staff.id, dto.leaveDate);

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

  async findById(id: string): Promise<LeaveRequest> {
    return this.toResponse(await this.findEntityById(id));
  }

  private async findEntityById(id: string): Promise<DbLeaveRequest> {
    const leaveRequest = await this.leaveRequestRepository.findOne(
      { id: Number(id) },
      { populate: ['resolvedByStaff', 'staff'] },
    );
    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    return leaveRequest;
  }

  async approve(
    id: string,
    dto: ProcessLeaveRequestDto,
  ): Promise<LeaveRequest> {
    return this.process(id, dto, LeaveStatus.APPROVED);
  }

  async reject(id: string, dto: ProcessLeaveRequestDto): Promise<LeaveRequest> {
    return this.process(id, dto, LeaveStatus.REJECTED);
  }

  private async process(
    id: string,
    dto: ProcessLeaveRequestDto,
    status: LeaveStatus,
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

  private async ensureNoDuplicateRequest(
    staffId: number,
    leaveDate: string,
  ): Promise<void> {
    const existingRequest = await this.leaveRequestRepository.findOne({
      leaveDate,
      staff: staffId,
    });
    if (existingRequest) {
      throw new BadRequestException(
        'Staff already has a leave request for this date',
      );
    }
  }

  private async notifyHeads(leaveRequest: DbLeaveRequest): Promise<void> {
    const heads = await this.staffsService.findByRoleName('HEAD');
    await Promise.all(
      heads.map((head) =>
        this.mailService.send({
          to: head.email,
          subject: 'New leave request pending approval',
          text: `${leaveRequest.staff.fullName} requested leave on ${leaveRequest.leaveDate}.`,
        }),
      ),
    );
  }

  private isValidDate(value: string): boolean {
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
  }

  private toResponse(leaveRequest: DbLeaveRequest): LeaveRequest {
    return {
      id: leaveRequest.id,
      createdAt: leaveRequest.createdAt.toISOString(),
      leaveDate: leaveRequest.leaveDate,
      reason: leaveRequest.reason ?? '',
      rejectReason: leaveRequest.rejectReason,
      resolvedAt: leaveRequest.resolvedAt?.toISOString(),
      resolvedBy: leaveRequest.resolvedByStaff?.id,
      staffEmail: leaveRequest.staff.email,
      staffId: leaveRequest.staff.id,
      staffName: leaveRequest.staff.fullName,
      status: leaveRequest.status,
    };
  }
}

import { EntityRepository } from '@mikro-orm/mysql';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LeaveRequest as DbLeaveRequest } from '../database/entities/leave-request.entity';
import { LeaveStatus } from '../database/enums/leave-status.enum';
import { TypeLeave } from '../database/enums/type-leave.enum';
import { MailService } from '../mail/mail.service';
import { StaffsService } from '../staffs/staffs.service';
import { PaginationMetaDto } from '../common/dto/success-response.dto';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { ProcessLeaveRequestDto } from './dto/process-leave-request.dto';
import {
  CreateLeaveRequestResponse,
  LeaveRequest,
  LeaveRequestStatus,
} from './leave-request.model';

@Injectable()
export class LeaveRequestsService {
  private readonly logger = new Logger(LeaveRequestsService.name);

  constructor(
    @InjectRepository(DbLeaveRequest)
    private readonly leaveRequestRepository: EntityRepository<DbLeaveRequest>,
    private readonly staffsService: StaffsService,
    private readonly mailService: MailService,
  ) {}

  async create(
    dto: CreateLeaveRequestDto,
  ): Promise<CreateLeaveRequestResponse> {
    const staff = await this.staffsService.findEntityById(dto.staffId);

    if (!dto.reason?.trim()) {
      throw new BadRequestException('Leave reason is required');
    }
    if (!this.isValidDate(dto.leaveDate)) {
      throw new BadRequestException('Leave date is invalid');
    }
    if (this.isWeekendDate(dto.leaveDate)) {
      throw new BadRequestException('Leave date must be a business day');
    }

    await this.ensureNoDuplicateRequest(staff.id, dto.leaveDate);
    const leaveRequest = this.leaveRequestRepository.create({
      createdAt: new Date(),
      leaveDate: dto.leaveDate,
      reason: dto.reason.trim(),
      staff,
      status: LeaveStatus.PENDING,
      type: dto.type ?? TypeLeave.FULL,
      updatedAt: new Date(),
    });

    await this.leaveRequestRepository.getEntityManager().persistAndFlush(leaveRequest);

    this.logger.log(
      `Created leave request for staffId=${staff.id} (${staff.email}) leaveDate=${dto.leaveDate} type=${leaveRequest.type}`,
    );
    void this.notifyApprovers(leaveRequest, staff.email, staff.smtpPass).catch(
      (error) => {
        this.logger.error(
          `Failed to notify approvers for leaveRequestId=${leaveRequest.id}`,
          (error as Error)?.stack,
        );
      },
    );

    return {
      totalDays: this.getTypeWeight(leaveRequest.type),
      requests: [this.toResponse(leaveRequest)],
    };
  }

  async findAll(
    status?: LeaveRequestStatus,
    page = 1,
    limit = 10,
    staffId?: number,
  ): Promise<{ data: LeaveRequest[]; meta: PaginationMetaDto }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const filter: Record<string, unknown> = {};
    if (status) {
      filter.status = this.toDbStatus(status);
    }
    if (typeof staffId === 'number' && staffId > 0) {
      filter.staff = staffId;
    }
    const offset = (safePage - 1) * safeLimit;

    const [requests, totalItems] = await Promise.all([
      this.leaveRequestRepository.find(filter, {
        limit: safeLimit,
        offset,
        orderBy: { createdAt: 'DESC' },
        populate: ['resolvedByStaff', 'staff'],
      }),
      this.leaveRequestRepository.count(filter),
    ]);

    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / safeLimit);
    return {
      data: requests.map((request) => this.toResponse(request)),
      meta: {
        page: safePage,
        limit: safeLimit,
        totalItems,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPreviousPage: safePage > 1 && totalPages > 0,
      },
    };
  }

  async findById(id: number): Promise<LeaveRequest> {
    return this.toResponse(await this.findEntityById(id));
  }

  async approve(
    id: number,
    dto: ProcessLeaveRequestDto,
    resolverStaffId: number,
  ): Promise<LeaveRequest> {
    return this.process(id, dto, LeaveStatus.APPROVED, resolverStaffId);
  }

  async reject(
    id: number,
    dto: ProcessLeaveRequestDto,
    resolverStaffId: number,
  ): Promise<LeaveRequest> {
    return this.process(id, dto, LeaveStatus.REJECTED, resolverStaffId);
  }

  private async process(
    id: number,
    dto: ProcessLeaveRequestDto,
    status: LeaveStatus,
    resolverStaffId: number,
  ): Promise<LeaveRequest> {
    const resolverStaff =
      await this.staffsService.findEntityById(resolverStaffId);
    if (!['HEAD', 'MANAGER', 'ADMIN'].includes(resolverStaff.role.name)) {
      throw new BadRequestException(
        'Only HEAD, MANAGER, or ADMIN can process leave requests',
      );
    }

    const leaveRequest = await this.findEntityById(id);
    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Leave request is already processed');
    }

    leaveRequest.status = status;
    leaveRequest.resolvedByStaff = resolverStaff;
    leaveRequest.resolvedAt = new Date();
    leaveRequest.rejectReason =
      status === LeaveStatus.REJECTED ? dto.note?.trim() : undefined;
    if (status === LeaveStatus.APPROVED) {
      leaveRequest.staff.leaveCredit = Number(
        Number(leaveRequest.staff.leaveCredit) -
          this.getTypeWeight(leaveRequest.type),
      );
    }

    await this.leaveRequestRepository.getEntityManager().flush();
    this.logger.log(
      `Processed leaveRequestId=${leaveRequest.id} status=${status} resolverStaffId=${resolverStaff.id} staffId=${leaveRequest.staff.id}`,
    );
    const headSender = await this.getHeadSender();
    await this.mailService.send(
      {
        to: leaveRequest.staff.email,
        subject: `Leave request ${status}`,
        text: `Your leave request ${leaveRequest.id} was ${status}.`,
      },
      {
        smtpUser: headSender.email,
        smtpPass: headSender.smtpPass,
      },
    );

    return this.toResponse(leaveRequest);
  }

  private async findEntityById(id: number): Promise<DbLeaveRequest> {
    const leaveRequest = await this.leaveRequestRepository.findOne(
      { id },
      { populate: ['resolvedByStaff', 'staff'] },
    );
    if (!leaveRequest) {
      throw new NotFoundException('Leave request not found');
    }

    return leaveRequest;
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

  private async notifyApprovers(
    leaveRequest: DbLeaveRequest,
    senderEmail: string,
    senderSmtpPass: string,
  ): Promise<void> {
    const [heads, managers] = await Promise.all([
      this.staffsService.findByRoleName('HEAD'),
      this.staffsService.findByRoleName('MANAGER'),
    ]);
    const recipients = [...heads, ...managers]
      .map((staff) => staff.email)
      .filter(Boolean);
    const uniqueRecipients = Array.from(new Set(recipients));

    this.logger.debug(
      `Notifying approvers for leaveRequestId=${leaveRequest.id} leaveDate=${leaveRequest.leaveDate} recipients=${uniqueRecipients.join(',') || '(none)'}`,
    );

    await Promise.all(
      uniqueRecipients.map((email) =>
        this.mailService.send(
          {
            to: email,
            subject: `📌 Leave Request Pending Approval`,
            text: `A new leave request is waiting for approval.`,
            html: `
            <div style="
              font-family: Arial, sans-serif;
              background-color: #f4f6f9;
              padding: 24px;
            ">
              <div style="
                max-width: 600px;
                margin: auto;
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
              ">
                
                <div style="
                  background: #2563eb;
                  color: white;
                  padding: 20px 24px;
                ">
                  <h1 style="
                    margin: 0;
                    font-size: 22px;
                  ">
                    Leave Request Notification
                  </h1>
                </div>
    
                <div style="padding: 24px;">
                  <p style="
                    font-size: 16px;
                    color: #374151;
                    margin-bottom: 16px;
                  ">
                    A new leave request is waiting for approval.
                  </p>
    
                  <div style="
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 16px;
                  ">
                    <p style="margin: 0 0 12px 0;">
                      <strong>Employee:</strong>
                      ${leaveRequest.staff.fullName}
                    </p>
    
                    <p style="margin: 0;">
                      <strong>Leave Date:</strong>
                      ${leaveRequest.leaveDate}
                    </p>
                  </div>
    
                  <p style="
                    margin-top: 24px;
                    font-size: 14px;
                    color: #6b7280;
                  ">
                    Please review this request in the management system.
                  </p>
                </div>
    
              </div>
            </div>
          `,
          },
          {
            smtpUser: senderEmail,
            smtpPass: senderSmtpPass,
          },
        ),
      ),
    );
  }

  private async getHeadSender(): Promise<{ email: string; smtpPass: string }> {
    const heads = await this.staffsService.findByRoleName('HEAD');
    const headSender = heads.find(
      (head) => Boolean(head.email?.trim()) && Boolean(head.smtpPass?.trim()),
    );

    if (!headSender) {
      throw new BadRequestException(
        'No HEAD account with SMTP credentials is available to send notifications',
      );
    }

    return {
      email: headSender.email,
      smtpPass: headSender.smtpPass,
    };
  }

  private isValidDate(value: string): boolean {
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
  }

  private isWeekendDate(leaveDate: string): boolean {
    const date = new Date(`${leaveDate}T00:00:00.000Z`);
    const day = date.getUTCDay();
    return day === 0 || day === 6;
  }

  private getTypeWeight(type: TypeLeave): number {
    switch (type) {
      case TypeLeave.MORNING:
      case TypeLeave.AFTERNOON:
        return 0.5;
      case TypeLeave.FULL:
      default:
        return 1;
    }
  }

  private toDbStatus(status: LeaveRequestStatus): LeaveStatus {
    switch (status) {
      case 'approved':
        return LeaveStatus.APPROVED;
      case 'rejected':
        return LeaveStatus.REJECTED;
      case 'pending':
      default:
        return LeaveStatus.PENDING;
    }
  }

  private toApiStatus(status: LeaveStatus): LeaveRequestStatus {
    switch (status) {
      case LeaveStatus.APPROVED:
        return 'approved';
      case LeaveStatus.REJECTED:
        return 'rejected';
      case LeaveStatus.PENDING:
      default:
        return 'pending';
    }
  }

  private toResponse(leaveRequest: DbLeaveRequest): LeaveRequest {
    return {
      id: leaveRequest.id,
      createdAt: leaveRequest.createdAt.toISOString(),
      leaveDate: leaveRequest.leaveDate,
      reason: leaveRequest.reason,
      type: leaveRequest.type,
      rejectReason: leaveRequest.rejectReason,
      processedAt: leaveRequest.resolvedAt?.toISOString(),
      resolvedByStaffId: leaveRequest.resolvedByStaff?.id,
      staffEmail: leaveRequest.staff.email,
      staffId: leaveRequest.staff.id,
      staffName: leaveRequest.staff.fullName,
      employeeEmail: leaveRequest.staff.email,
      employeeName: leaveRequest.staff.fullName,
      status: this.toApiStatus(leaveRequest.status),
      staff: {
        id: leaveRequest.staff.id,
        fullName: leaveRequest.staff.fullName,
        email: leaveRequest.staff.email,
      },
      resolvedByStaff: leaveRequest.resolvedByStaff
        ? {
            id: leaveRequest.resolvedByStaff.id,
            fullName: leaveRequest.resolvedByStaff.fullName,
            email: leaveRequest.resolvedByStaff.email,
          }
        : undefined,
    };
  }
}

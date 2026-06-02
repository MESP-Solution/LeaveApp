import { EntityRepository } from '@mikro-orm/mysql';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedStaff } from '../auth/auth.types';
import { LeaveRequest as DbLeaveRequest } from '../database/entities/leave-request.entity';
import { LeaveStatus } from '../database/enums/leave-status.enum';
import { TypeLeave } from '../database/enums/type-leave.enum';
import { approverNotificationHtml, outcomeNotificationHtml } from '../mail/email-templates';
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

// A leave request must be submitted at least this many calendar days ahead
// of the requested leave date, counted from "today" (Asia/Ho_Chi_Minh).
const MINIMUM_LEAVE_LEAD_DAYS = 3;

@Injectable()
export class LeaveRequestsService {
  private readonly logger = new Logger(LeaveRequestsService.name);

  constructor(
    @InjectRepository(DbLeaveRequest)
    private readonly leaveRequestRepository: EntityRepository<DbLeaveRequest>,
    private readonly staffsService: StaffsService,
    private readonly mailService: MailService,
  ) { }

  async create(
    dto: CreateLeaveRequestDto,
    requester: AuthenticatedStaff,
  ): Promise<CreateLeaveRequestResponse> {
    // A staff can only create a leave request for themselves; the body's
    // staffId (if any) is ignored to prevent creating requests on behalf.
    const staff = await this.staffsService.findEntityById(requester.id);

    if (!dto.reason?.trim()) {
      throw new BadRequestException('Leave reason is required');
    }
    if (!this.isValidDate(dto.leaveDate)) {
      throw new BadRequestException('Leave date is invalid');
    }
    if (this.isWeekendDate(dto.leaveDate, dto.type)) {
      throw new BadRequestException('Leave date must be a business day');
    }
    if (this.isBeforeMinimumLeadTime(dto.leaveDate)) {
      throw new BadRequestException(
        `Leave date must be at least ${MINIMUM_LEAVE_LEAD_DAYS} days from today`,
      );
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
    void this.notifyApprovers(leaveRequest).catch((error) => {
      this.logger.error(
        `Failed to notify approvers for leaveRequestId=${leaveRequest.id}`,
        (error as Error)?.stack,
      );
    });

    return {
      totalDays: this.getTypeWeight(leaveRequest.type),
      requests: [this.toResponse(leaveRequest)],
    };
  }

  async findAll(
    status: LeaveRequestStatus | undefined,
    page = 1,
    limit = 10,
    requester: AuthenticatedStaff,
    staffId?: number,
  ): Promise<{ data: LeaveRequest[]; meta: PaginationMetaDto }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const filter: Record<string, unknown> = this.buildListScope(
      requester,
      staffId,
    );
    if (status) {
      filter.status = this.toDbStatus(status);
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

  async findById(
    id: number,
    requester: AuthenticatedStaff,
  ): Promise<LeaveRequest> {
    const leaveRequest = await this.findEntityById(id);
    this.assertCanView(leaveRequest, requester);
    return this.toResponse(leaveRequest);
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
    const resolverRole = resolverStaff.role.name.toUpperCase();
    if (!['MANAGER', 'ADMIN'].includes(resolverRole)) {
      throw new ForbiddenException(
        'Only MANAGER or ADMIN can process leave requests',
      );
    }

    const leaveRequest = await this.findEntityById(id);
    if (leaveRequest.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Leave request is already processed');
    }

    // MANAGER can only process requests from their own department.
    if (resolverRole === 'MANAGER') {
      const resolverDeptId = resolverStaff.department?.id;
      const requesterDeptId = leaveRequest.staff.department?.id;
      if (!resolverDeptId || resolverDeptId !== requesterDeptId) {
        throw new ForbiddenException(
          'You can only process leave requests from your own department',
        );
      }
    }

    const typeWeight = this.getTypeWeight(leaveRequest.type);
    // Approving must never drive the staff's leave credit negative.
    if (
      status === LeaveStatus.APPROVED &&
      Number(leaveRequest.staff.leaveCredit) < typeWeight
    ) {
      throw new BadRequestException(
        'Insufficient leave credit to approve this request',
      );
    }

    leaveRequest.status = status;
    leaveRequest.resolvedByStaff = resolverStaff;
    leaveRequest.resolvedAt = new Date();
    leaveRequest.rejectReason =
      status === LeaveStatus.REJECTED ? dto.note?.trim() : undefined;
    if (status === LeaveStatus.APPROVED) {
      leaveRequest.staff.leaveCredit = Number(
        Number(leaveRequest.staff.leaveCredit) - typeWeight,
      );
    }

    await this.leaveRequestRepository.getEntityManager().flush();
    this.logger.log(
      `Processed leaveRequestId=${leaveRequest.id} status=${status} resolverStaffId=${resolverStaff.id} staffId=${leaveRequest.staff.id}`,
    );

    const approved = status === LeaveStatus.APPROVED;
    await this.mailService.sendWithAppResend({
      to: leaveRequest.staff.email,
      subject: approved ? 'Đơn nghỉ phép đã được duyệt' : 'Đơn nghỉ phép bị từ chối',
      text: `Đơn nghỉ phép #${leaveRequest.id} đã ${approved ? 'được duyệt' : 'bị từ chối'}.`,
      html: outcomeNotificationHtml({
        staffName: leaveRequest.staff.fullName,
        leaveDate: leaveRequest.leaveDate,
        type: leaveRequest.type,
        approved,
        resolverName: resolverStaff.fullName,
        rejectReason: leaveRequest.rejectReason ?? undefined,
      }),
    });

    return this.toResponse(leaveRequest);
  }

  /**
   * Restricts which leave requests a requester may list:
   * - STAFF: only their own requests.
   * - MANAGER: only requests of staff in their department.
   * - ADMIN: everything (optionally narrowed by staffId).
   */
  private buildListScope(
    requester: AuthenticatedStaff,
    staffId?: number,
  ): Record<string, unknown> {
    const role = requester.role.toUpperCase();

    if (role === 'STAFF') {
      return { staff: requester.id };
    }

    if (role === 'MANAGER') {
      if (typeof requester.departmentId !== 'number') {
        throw new ForbiddenException('No department assigned to your account');
      }
      return { staff: { department: requester.departmentId } };
    }

    // ADMIN: full access, optional staffId narrowing.
    if (typeof staffId === 'number' && staffId > 0) {
      return { staff: staffId };
    }
    return {};
  }

  /**
   * Authorizes viewing a single leave request, mirroring buildListScope.
   */
  private assertCanView(
    leaveRequest: DbLeaveRequest,
    requester: AuthenticatedStaff,
  ): void {
    const role = requester.role.toUpperCase();

    if (role === 'ADMIN') {
      return;
    }
    if (role === 'STAFF') {
      if (leaveRequest.staff.id !== requester.id) {
        throw new ForbiddenException('You can only view your own leave requests');
      }
      return;
    }
    // MANAGER: same department only.
    if (
      typeof requester.departmentId !== 'number' ||
      leaveRequest.staff.department?.id !== requester.departmentId
    ) {
      throw new ForbiddenException(
        'You can only view leave requests from your own department',
      );
    }
  }

  private async findEntityById(id: number): Promise<DbLeaveRequest> {
    const leaveRequest = await this.leaveRequestRepository.findOne(
      { id },
      { populate: ['resolvedByStaff', 'staff', 'staff.department'] },
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

  private async notifyApprovers(leaveRequest: DbLeaveRequest): Promise<void> {
    // Only the MANAGER(s) of the requester's department are notified.
    const departmentId = leaveRequest.staff.department?.id ?? null;
    const approvers =
      await this.staffsService.findLeaveApprovers(departmentId);

    this.logger.debug(
      `Notifying approvers for leaveRequestId=${leaveRequest.id} leaveDate=${leaveRequest.leaveDate} recipients=${approvers.map((a) => a.email).join(',') || '(none)'}`,
    );

    const mailMessage = {
      subject: 'Đơn nghỉ phép mới chờ duyệt',
      text: `${leaveRequest.staff.fullName} đã gửi đơn nghỉ phép ngày ${leaveRequest.leaveDate}.`,
      html: approverNotificationHtml({
        staffName: leaveRequest.staff.fullName,
        leaveDate: leaveRequest.leaveDate,
        type: leaveRequest.type,
        reason: leaveRequest.reason,
      }),
    };

    const to = Array.from(
      new Set(
        approvers
          .map((a) => a.email.trim())
          .filter(Boolean),
      ),
    );
    if (to.length === 0) {
      return;
    }

    await this.mailService.sendWithAppResend({
      ...mailMessage,
      to,
    });
  }

  protected getNow(): Date {
    return new Date();
  }

  /**
   * Enforces the minimum lead time: the leave date must be at least
   * MINIMUM_LEAVE_LEAD_DAYS calendar days after "today". "Today" is resolved in
   * the Asia/Ho_Chi_Minh timezone so the cut-off matches the staff's local date
   * regardless of the server timezone. Past dates fail naturally (they are
   * earlier than the earliest allowed date).
   */
  private isBeforeMinimumLeadTime(leaveDate: string): boolean {
    const earliestAllowed = this.addCalendarDays(
      this.getLocalTodayDateString(),
      MINIMUM_LEAVE_LEAD_DAYS,
    );
    return leaveDate < earliestAllowed;
  }

  private getLocalTodayDateString(): string {
    // en-CA formats as YYYY-MM-DD, which is directly comparable as a string.
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(this.getNow());

    const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
    const month = parts.find((p) => p.type === 'month')?.value ?? '01';
    const day = parts.find((p) => p.type === 'day')?.value ?? '01';
    return `${year}-${month}-${day}`;
  }

  private addCalendarDays(dateStr: string, days: number): string {
    const [year, month, day] = dateStr.split('-').map((v) => parseInt(v, 10));
    const base = new Date(Date.UTC(year, month - 1, day));
    base.setUTCDate(base.getUTCDate() + days);
    const y = base.getUTCFullYear();
    const m = String(base.getUTCMonth() + 1).padStart(2, '0');
    const d = String(base.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private isValidDate(value: string): boolean {
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
  }

  private isWeekendDate(leaveDate: string, type: TypeLeave = TypeLeave.FULL): boolean {
    const date = new Date(`${leaveDate}T00:00:00.000Z`);
    const day = date.getUTCDay();
    if (day === 0) {
      return true;
    }
    if (day === 6) {

      return type !== TypeLeave.MORNING;
    }
    return false;
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

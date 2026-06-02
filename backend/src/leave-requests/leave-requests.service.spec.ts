import { EntityRepository } from '@mikro-orm/mysql';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Department } from '../database/entities/department.entity';
import { LeaveRequest as DbLeaveRequest } from '../database/entities/leave-request.entity';
import { Role } from '../database/entities/role.entity';
import { Staff } from '../database/entities/staff.entity';
import { LeaveStatus } from '../database/enums/leave-status.enum';
import { TypeLeave } from '../database/enums/type-leave.enum';
import { MailService } from '../mail/mail.service';
import { StaffsService } from '../staffs/staffs.service';
import { LeaveRequestsService } from './leave-requests.service';

describe('LeaveRequestsService', () => {
  let dbRequests: DbLeaveRequest[];
  let leaveRequestsService: LeaveRequestsService;
  let nextId: number;
  let staffsService: Pick<
    StaffsService,
    'findEntityById' | 'findLeaveApprovers'
  >;
  let mailService: Pick<MailService, 'sendWithAppResend'>;

  beforeEach(() => {
    dbRequests = [];
    nextId = 1;

    const entityManager = {
      flush: jest.fn().mockResolvedValue(undefined),
      persistAndFlush: jest
        .fn()
        .mockImplementation((payload: DbLeaveRequest | DbLeaveRequest[]) => {
          const requests = Array.isArray(payload) ? payload : [payload];
          for (const request of requests) {
            request.id = nextId;
            nextId += 1;
            dbRequests.push(request);
          }

          return Promise.resolve();
        }),
    };

    const leaveRequestRepository = {
      create: jest
        .fn()
        .mockImplementation((data: Partial<DbLeaveRequest>) =>
          Object.assign(new DbLeaveRequest(), data),
        ),
      find: jest
        .fn()
        .mockImplementation((filter?: { status?: LeaveStatus }) =>
          Promise.resolve(
            filter?.status
              ? dbRequests.filter((request) => request.status === filter.status)
              : dbRequests,
          ),
        ),
      findOne: jest
        .fn()
        .mockImplementation(
          (filter: { id?: number; leaveDate?: string; staff?: number }) => {
            const request = dbRequests.find((item) => {
              if (filter.id !== undefined) {
                return item.id === filter.id;
              }

              if (
                filter.leaveDate === undefined ||
                filter.staff === undefined
              ) {
                return false;
              }

              return (
                item.leaveDate === filter.leaveDate &&
                item.staff.id === filter.staff
              );
            });

            return Promise.resolve(request ?? null);
          },
        ),
      getEntityManager: jest.fn(() => entityManager),
    };

    staffsService = {
      findEntityById: jest.fn((id: number): Promise<Staff> => {
        const staff = mockStaffs.find((item) => item.id === id);
        if (!staff) {
          throw new Error('Staff not found');
        }

        return Promise.resolve(staff);
      }),
      findLeaveApprovers: jest.fn(
        (departmentId: number | null): Promise<Staff[]> =>
          Promise.resolve(
            mockStaffs.filter(
              (staff) =>
                staff.role.name === 'MANAGER' &&
                staff.department?.id === departmentId,
            ),
          ),
      ),
    };

    mailService = {
      sendWithAppResend: jest.fn().mockResolvedValue(undefined),
    };

    leaveRequestsService = new LeaveRequestsService(
      leaveRequestRepository as unknown as EntityRepository<DbLeaveRequest>,
      staffsService as StaffsService,
      mailService as MailService,
    );

    jest.spyOn(leaveRequestsService as any, 'getNow').mockReturnValue(new Date('2026-05-01T00:00:00Z'));
  });

  // Staff 1 creates their own requests; create() derives staffId from this requester.
  const staffRequester = {
    id: 1,
    email: '1@company.local',
    fullName: 'Nguyen Van An',
    leaveCredit: 12,
    role: 'STAFF',
    departmentId: 1,
  };

  function createOwnRequest(
    dto: Parameters<LeaveRequestsService['create']>[0],
  ) {
    return leaveRequestsService.create(dto, staffRequester);
  }

  it('creates a pending leave request for one date', async () => {
    const created = await createOwnRequest({
      leaveDate: '2026-05-04',
      reason: 'Family trip',
      staffId: 1,
      type: TypeLeave.FULL,
    });

    expect(created.totalDays).toBe(1);
    expect(created.requests[0].status).toBe('pending');
    expect(created.requests[0].leaveDate).toBe('2026-05-04');
    expect(created.requests[0].staffId).toBe(1);
  });

  it('notifies only the department MANAGER in one Resend request', async () => {
    await createOwnRequest({
      leaveDate: '2026-05-08',
      reason: 'Conference',
      staffId: 1,
      type: TypeLeave.FULL,
    });

    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(mailService.sendWithAppResend).toHaveBeenCalledTimes(1);
    // Recipients = the MANAGER(s) of the requester's department only (no ADMIN),
    // so only MANAGER 2 (same department) is notified.
    expect((mailService.sendWithAppResend as jest.Mock).mock.calls[0][0].to)
      .toEqual(['2@company.local']);
  });

  it('creates half-day leave request and returns decimal totalDays', async () => {
    const created = await createOwnRequest({
      leaveDate: '2026-05-05',
      reason: 'Family trip',
      staffId: 1,
      type: TypeLeave.MORNING,
    });

    expect(created.totalDays).toBe(0.5);
    expect(created.requests[0].type).toBe(TypeLeave.MORNING);
  });

  it('creates leave request without waiting for approver notification', async () => {
    (mailService.sendWithAppResend as jest.Mock).mockRejectedValueOnce(
      new Error('SMTP down'),
    );

    const created = await createOwnRequest({
      leaveDate: '2026-05-06',
      reason: 'Doctor appointment',
      staffId: 1,
      type: TypeLeave.FULL,
    });

    expect(created.totalDays).toBe(1);
    expect(created.requests[0].status).toBe('pending');
  });

  it('prevents duplicate leave requests on the same date', async () => {
    await createOwnRequest({
      leaveDate: '2026-05-04',
      reason: 'Family trip',
      staffId: 1,
      type: TypeLeave.FULL,
    });

    await expect(
      createOwnRequest({
        leaveDate: '2026-05-04',
        reason: 'Family trip',
        staffId: 1,
        type: TypeLeave.FULL,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows managers to approve pending requests', async () => {
    const created = await createOwnRequest({
      leaveDate: '2026-05-04',
      reason: 'Personal work',
      staffId: 1,
      type: TypeLeave.AFTERNOON,
    });

    const staff = await staffsService.findEntityById(1);
    expect(staff.leaveCredit).toBe(12);

    const approved = await leaveRequestsService.approve(
      created.requests[0].id,
      {
        note: 'Approved',
      },
      2,
    );

    expect(approved.status).toBe('approved');
    expect(approved.resolvedByStaffId).toBe(2);
    expect(staff.leaveCredit).toBe(11.5);
    expect(mailService.sendWithAppResend).toHaveBeenLastCalledWith(
      expect.objectContaining({
        to: '1@company.local',
        subject: 'Đơn nghỉ phép đã được duyệt',
      }),
    );
  });

  it('allows managers to reject pending requests', async () => {
    const created = await createOwnRequest({
      leaveDate: '2026-05-04',
      reason: 'Personal work',
      staffId: 1,
      type: TypeLeave.FULL,
    });

    const rejected = await leaveRequestsService.reject(
      created.requests[0].id,
      {
        note: 'Trung lich hop',
      },
      2,
    );

    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectReason).toBe('Trung lich hop');
  });

  it('forbids a MANAGER from another department from processing the request', async () => {
    const created = await createOwnRequest({
      leaveDate: '2026-05-04',
      reason: 'Personal work',
      staffId: 1,
      type: TypeLeave.FULL,
    });

    // Resolver 4 is a MANAGER in department 2; staff 1 belongs to department 1.
    await expect(
      leaveRequestsService.approve(created.requests[0].id, {}, 4),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects processing from regular staff', async () => {
    const created = await createOwnRequest({
      leaveDate: '2026-05-04',
      reason: 'Personal work',
      staffId: 1,
      type: TypeLeave.FULL,
    });

    await expect(
      leaveRequestsService.approve(created.requests[0].id, {}, 1),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects processing requests already handled', async () => {
    const created = await createOwnRequest({
      leaveDate: '2026-05-04',
      reason: 'Personal work',
      staffId: 1,
      type: TypeLeave.FULL,
    });

    await leaveRequestsService.approve(created.requests[0].id, {}, 2);

    await expect(
      leaveRequestsService.reject(
        created.requests[0].id,
        { note: 'Late update' },
        2,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses app Resend key when manager approves a request', async () => {
    const created = await createOwnRequest({
      leaveDate: '2026-05-07',
      reason: 'Personal work',
      staffId: 1,
      type: TypeLeave.FULL,
    });

    await leaveRequestsService.approve(created.requests[0].id, {}, 2);

    expect(mailService.sendWithAppResend).toHaveBeenLastCalledWith(
      expect.objectContaining({
        to: '1@company.local',
        subject: 'Đơn nghỉ phép đã được duyệt',
      }),
    );
  });

  it('blocks approval that would drive leave credit negative', async () => {
    // Staff 5 has 0.5 credit; a FULL day (weight 1) would go negative.
    const created = await leaveRequestsService.create(
      {
        leaveDate: '2026-05-04',
        reason: 'Personal work',
        type: TypeLeave.FULL,
      },
      {
        id: 5,
        email: '5@company.local',
        fullName: 'Vu Van Kiet',
        leaveCredit: 0.5,
        role: 'STAFF',
        departmentId: 1,
      },
    );

    await expect(
      leaveRequestsService.approve(created.requests[0].id, {}, 2),
    ).rejects.toBeInstanceOf(BadRequestException);
    // Credit must remain unchanged.
    expect((await staffsService.findEntityById(5)).leaveCredit).toBe(0.5);
  });

  it('forbids a STAFF from viewing another staff leave request', async () => {
    const created = await createOwnRequest({
      leaveDate: '2026-05-04',
      reason: 'Personal work',
      staffId: 1,
      type: TypeLeave.FULL,
    });

    await expect(
      leaveRequestsService.findById(created.requests[0].id, {
        id: 5,
        email: '5@company.local',
        fullName: 'Vu Van Kiet',
        leaveCredit: 0.5,
        role: 'STAFF',
        departmentId: 1,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids a MANAGER from another department from viewing the request', async () => {
    const created = await createOwnRequest({
      leaveDate: '2026-05-04',
      reason: 'Personal work',
      staffId: 1,
      type: TypeLeave.FULL,
    });

    await expect(
      leaveRequestsService.findById(created.requests[0].id, {
        id: 4,
        email: '4@company.local',
        fullName: 'Le Thi Hoa',
        leaveCredit: 12,
        role: 'MANAGER',
        departmentId: 2,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows the owner STAFF to view their own request', async () => {
    const created = await createOwnRequest({
      leaveDate: '2026-05-04',
      reason: 'Personal work',
      staffId: 1,
      type: TypeLeave.FULL,
    });

    const found = await leaveRequestsService.findById(
      created.requests[0].id,
      staffRequester,
    );
    expect(found.id).toBe(created.requests[0].id);
  });

  describe('Minimum lead time validation (>= 3 calendar days)', () => {
    const minLeadError = new BadRequestException(
      'Leave date must be at least 3 days from today',
    );

    it('blocks leave requests for a date in the past', async () => {
      jest.spyOn(leaveRequestsService as any, 'getNow').mockReturnValue(new Date('2026-05-15T09:00:00Z'));

      await expect(
        createOwnRequest({
          leaveDate: '2026-05-14',
          reason: 'Sick leave',
          staffId: 1,
          type: TypeLeave.FULL,
        }),
      ).rejects.toThrow(minLeadError);
    });

    it('blocks leave requests for today', async () => {
      // Local today (Asia/Ho_Chi_Minh) = 2026-05-15.
      jest.spyOn(leaveRequestsService as any, 'getNow').mockReturnValue(new Date('2026-05-15T01:00:00Z'));

      await expect(
        createOwnRequest({
          leaveDate: '2026-05-15',
          reason: 'Same day',
          staffId: 1,
          type: TypeLeave.FULL,
        }),
      ).rejects.toThrow(minLeadError);
    });

    it('blocks leave requests fewer than 3 days ahead', async () => {
      // today (local) = 2026-05-18 (Monday); earliest allowed = 2026-05-21.
      jest.spyOn(leaveRequestsService as any, 'getNow').mockReturnValue(new Date('2026-05-18T01:00:00Z'));

      // 2026-05-20 (Wednesday) is only 2 days ahead -> blocked.
      await expect(
        createOwnRequest({
          leaveDate: '2026-05-20',
          reason: 'Too soon',
          staffId: 1,
          type: TypeLeave.FULL,
        }),
      ).rejects.toThrow(minLeadError);
    });

    it('allows leave requests exactly 3 days ahead', async () => {
      jest.spyOn(leaveRequestsService as any, 'getNow').mockReturnValue(new Date('2026-05-15T01:00:00Z'));

      // 2026-05-18 is exactly 3 days after today (2026-05-15) -> allowed.
      const created = await createOwnRequest({
        leaveDate: '2026-05-18',
        reason: 'Exactly three days',
        staffId: 1,
        type: TypeLeave.FULL,
      });

      expect(created.requests[0].status).toBe('pending');
    });

    it('allows leave requests more than 3 days ahead', async () => {
      jest.spyOn(leaveRequestsService as any, 'getNow').mockReturnValue(new Date('2026-05-15T09:00:00Z'));

      const created = await createOwnRequest({
        leaveDate: '2026-05-25',
        reason: 'Future planning',
        staffId: 1,
        type: TypeLeave.FULL,
      });

      expect(created.requests[0].status).toBe('pending');
    });

    it('uses the Asia/Ho_Chi_Minh local date for the cut-off', async () => {
      // 2026-05-15T18:00:00Z is 2026-05-16 01:00 local -> today = 2026-05-16,
      // so the earliest allowed date is 2026-05-19, not 2026-05-18.
      jest.spyOn(leaveRequestsService as any, 'getNow').mockReturnValue(new Date('2026-05-15T18:00:00Z'));

      await expect(
        createOwnRequest({
          leaveDate: '2026-05-18',
          reason: 'Timezone edge',
          staffId: 1,
          type: TypeLeave.FULL,
        }),
      ).rejects.toThrow(minLeadError);
    });
  });
});

// Staff 2 is the sole MANAGER of department 1 and processes staff 1's requests.
// Staff 4 is a MANAGER in department 2 (used for the cross-department denial test).
const mockStaffs = [
  createMockStaff(1, 'Nguyen Van An', 'STAFF', 1),
  createMockStaff(2, 'Pham Thu Ha', 'MANAGER', 1),
  createMockStaff(3, 'Tran Minh Quan', 'STAFF', 1),
  createMockStaff(4, 'Le Thi Hoa', 'MANAGER', 2),
  // Staff 5: STAFF in department 1 with only 0.5 day of credit left.
  createMockStaff(5, 'Vu Van Kiet', 'STAFF', 1, 0.5),
];

function createMockStaff(
  id: number,
  fullName: string,
  roleName: string,
  departmentId: number,
  leaveCredit = 12,
): Staff {
  const role = new Role();
  role.id = id;
  role.name = roleName;

  const department = new Department();
  department.id = departmentId;
  department.name = `DEPT-${departmentId}`;

  const staff = new Staff();
  staff.id = id;
  staff.fullName = fullName;
  staff.email = `${id}@company.local`;
  staff.passwordHash = 'hashed-password';
  staff.role = role;
  staff.department = department;
  staff.leaveCredit = leaveCredit;
  staff.createdAt = new Date();
  staff.updatedAt = new Date();

  return staff;
}

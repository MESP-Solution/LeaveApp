import { EntityRepository } from '@mikro-orm/mysql';
import { BadRequestException } from '@nestjs/common';
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
  let staffsService: Pick<StaffsService, 'findByRoleName' | 'findEntityById'>;
  let mailService: Pick<MailService, 'send' | 'sendWithAppResend'>;

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
      findByRoleName: jest.fn(
        (roleName: string): Promise<Staff[]> =>
          Promise.resolve(
            mockStaffs.filter((staff) => staff.role.name === roleName),
          ),
      ),
    };

    mailService = {
      send: jest.fn().mockResolvedValue(undefined),
      sendWithAppResend: jest.fn().mockResolvedValue(undefined),
    };

    leaveRequestsService = new LeaveRequestsService(
      leaveRequestRepository as EntityRepository<DbLeaveRequest>,
      staffsService as StaffsService,
      mailService as MailService,
    );
  });

  it('creates a pending leave request for one date', async () => {
    const created = await leaveRequestsService.create({
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

  it('notifies HEAD and MANAGER in one Resend request (batched recipients)', async () => {
    await leaveRequestsService.create({
      leaveDate: '2026-05-08',
      reason: 'Conference',
      staffId: 1,
      type: TypeLeave.FULL,
    });

    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(mailService.sendWithAppResend).toHaveBeenCalledTimes(1);
    expect(mailService.sendWithAppResend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: expect.arrayContaining(['2@company.local', '3@company.local']),
      }),
    );
    expect((mailService.sendWithAppResend as jest.Mock).mock.calls[0][0].to)
      .toHaveLength(2);
    expect(mailService.send).not.toHaveBeenCalled();
  });

  it('creates half-day leave request and returns decimal totalDays', async () => {
    const created = await leaveRequestsService.create({
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

    const created = await leaveRequestsService.create({
      leaveDate: '2026-05-06',
      reason: 'Doctor appointment',
      staffId: 1,
      type: TypeLeave.FULL,
    });

    expect(created.totalDays).toBe(1);
    expect(created.requests[0].status).toBe('pending');
  });

  it('prevents duplicate leave requests on the same date', async () => {
    await leaveRequestsService.create({
      leaveDate: '2026-05-04',
      reason: 'Family trip',
      staffId: 1,
      type: TypeLeave.FULL,
    });

    await expect(
      leaveRequestsService.create({
        leaveDate: '2026-05-04',
        reason: 'Family trip',
        staffId: 1,
        type: TypeLeave.FULL,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows heads to approve pending requests', async () => {
    const created = await leaveRequestsService.create({
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
        subject: 'Leave request APPROVED',
      }),
    );
  });

  it('allows heads to reject pending requests', async () => {
    const created = await leaveRequestsService.create({
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

  it('rejects processing from regular staff', async () => {
    const created = await leaveRequestsService.create({
      leaveDate: '2026-05-04',
      reason: 'Personal work',
      staffId: 1,
      type: TypeLeave.FULL,
    });

    await expect(
      leaveRequestsService.approve(created.requests[0].id, {}, 1),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects processing requests already handled', async () => {
    const created = await leaveRequestsService.create({
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

  it("uses resolver's Resend credentials when manager approves a request", async () => {
    const created = await leaveRequestsService.create({
      leaveDate: '2026-05-07',
      reason: 'Personal work',
      staffId: 1,
      type: TypeLeave.FULL,
    });

    await leaveRequestsService.approve(created.requests[0].id, {}, 3);

    expect(mailService.send).toHaveBeenLastCalledWith(
      expect.objectContaining({
        to: '1@company.local',
        subject: 'Leave request APPROVED',
      }),
      expect.objectContaining({
        smtpUser: '3@company.local',
        smtpPass: 'smtp-pass-3',
      }),
    );
  });
});

const mockStaffs = [
  createMockStaff(1, 'Nguyen Van An', 'STAFF'),
  createMockStaff(2, 'Pham Thu Ha', 'HEAD'),
  createMockStaff(3, 'Tran Minh Quan', 'MANAGER'),
];

function createMockStaff(
  id: number,
  fullName: string,
  roleName: string,
): Staff {
  const role = new Role();
  role.id = id;
  role.name = roleName;

  const staff = new Staff();
  staff.id = id;
  staff.fullName = fullName;
  staff.email = `${id}@company.local`;
  staff.smtpPass = `smtp-pass-${id}`;
  staff.passwordHash = 'hashed-password';
  staff.role = role;
  staff.leaveCredit = 12;
  staff.createdAt = new Date();
  staff.updatedAt = new Date();

  return staff;
}

import { EntityManager } from '@mikro-orm/core';
import { EntityRepository } from '@mikro-orm/mysql';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { LeaveRequest } from '../database/entities/leave-request.entity';
import { Role } from '../database/entities/role.entity';
import { Staff } from '../database/entities/staff.entity';
import { StaffsService } from './staffs.service';

describe('StaffsService.remove', () => {
  it('throws ForbiddenException when attempting to self-delete', async () => {
    const staffRepository = {
      findOne: jest.fn(),
      count: jest.fn(),
    };

    const svc = new StaffsService(
      staffRepository as unknown as EntityRepository<Staff>,
      {} as unknown as EntityRepository<Role>,
      {
        count: jest.fn(() => Promise.resolve(0)),
      } as unknown as EntityRepository<LeaveRequest>,
      {
        removeAndFlush: jest.fn(() => Promise.resolve(undefined)),
      } as unknown as EntityManager,
    );

    await expect(svc.remove(1, 1)).rejects.toBeInstanceOf(ForbiddenException);
    expect(staffRepository.findOne).not.toHaveBeenCalled();
  });

  it('throws ConflictException when staff is createdBy for others', async () => {
    const staffs: Staff[] = [];

    const staffRepository = {
      findOne: jest.fn(({ id }: { id: number }) => {
        const staff = staffs.find((s) => s.id === id);
        return Promise.resolve(staff ?? null);
      }),
      count: jest.fn(({ createdBy }: { createdBy: number }) =>
        Promise.resolve(
          staffs.filter((s) => s.createdBy?.id === createdBy).length,
        ),
      ),
    };

    const leaveRequestRepository = {
      count: jest.fn(() => Promise.resolve(0)),
    };

    const em = {
      removeAndFlush: jest.fn(() => Promise.resolve(undefined)),
    };

    const svc = new StaffsService(
      staffRepository as unknown as EntityRepository<Staff>,
      {} as unknown as EntityRepository<Role>,
      leaveRequestRepository as unknown as EntityRepository<LeaveRequest>,
      em as unknown as EntityManager,
    );

    const creator = createStaff(1);
    const created = createStaff(2);
    created.createdBy = creator;
    staffs.push(creator, created);

    await expect(svc.remove(1)).rejects.toBeInstanceOf(ConflictException);
    expect(em.removeAndFlush).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when staff does not exist', async () => {
    const staffRepository = {
      findOne: jest.fn(() => Promise.resolve(null)),
      count: jest.fn(() => Promise.resolve(0)),
    };

    const svc = new StaffsService(
      staffRepository as unknown as EntityRepository<Staff>,
      {} as unknown as EntityRepository<Role>,
      {
        count: jest.fn(() => Promise.resolve(0)),
      } as unknown as EntityRepository<LeaveRequest>,
      {
        removeAndFlush: jest.fn(() => Promise.resolve(undefined)),
      } as unknown as EntityManager,
    );

    await expect(svc.remove(999)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('StaffsService.create (role rules)', () => {
  type ServiceWithRoleAssertions = {
    assertCanCreateRole: (
      creatorRole: string,
      targetRole: string,
    ) => Promise<void>;
  };

  function makeService({
    adminCount = 1,
  }: {
    adminCount?: number;
  } = {}) {
    const staffRepository = {
      count: jest.fn(({ role }: { role?: { name: string } }) => {
        if (role?.name === 'ADMIN') {
          return Promise.resolve(adminCount);
        }
        return Promise.resolve(0);
      }),
    };

    const svc = new StaffsService(
      staffRepository as unknown as EntityRepository<Staff>,
      {} as unknown as EntityRepository<Role>,
      {} as unknown as EntityRepository<LeaveRequest>,
      {} as unknown as EntityManager,
    );

    return { svc, staffRepository };
  }

  it('forbids HEAD from creating ADMIN', async () => {
    const { svc } = makeService({ adminCount: 0 });
    await expect(
      (svc as unknown as ServiceWithRoleAssertions).assertCanCreateRole(
        'HEAD',
        'ADMIN',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('forbids MANAGER from creating HEAD', async () => {
    const { svc } = makeService();
    await expect(
      (svc as unknown as ServiceWithRoleAssertions).assertCanCreateRole(
        'MANAGER',
        'HEAD',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows MANAGER to create STAFF', async () => {
    const { svc } = makeService();
    await expect(
      (svc as unknown as ServiceWithRoleAssertions).assertCanCreateRole(
        'MANAGER',
        'STAFF',
      ),
    ).resolves.toBeUndefined();
  });

  it('forbids MANAGER from creating MANAGER', async () => {
    const { svc } = makeService();
    await expect(
      (svc as unknown as ServiceWithRoleAssertions).assertCanCreateRole(
        'MANAGER',
        'MANAGER',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects creating a second ADMIN', async () => {
    const { svc } = makeService({ adminCount: 1 });
    await expect(
      (svc as unknown as ServiceWithRoleAssertions).assertCanCreateRole(
        'ADMIN',
        'ADMIN',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

function createStaff(id: number): Staff {
  const role = new Role();
  role.id = 1;
  role.name = 'ADMIN';

  const staff = new Staff();
  staff.id = id;
  staff.fullName = `Staff ${id}`;
  staff.email = `${id}@company.local`;
  staff.passwordHash = 'hashed';
  staff.smtpPass = `smtp-pass-${id}`;
  staff.role = role;
  staff.leaveCredit = 12;
  staff.createdAt = new Date();
  staff.updatedAt = new Date();
  return staff;
}

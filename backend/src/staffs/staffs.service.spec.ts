import { EntityManager } from '@mikro-orm/core';
import { EntityRepository } from '@mikro-orm/mysql';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Department } from '../database/entities/department.entity';
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
      {} as unknown as EntityRepository<Department>,
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
      {} as unknown as EntityRepository<Department>,
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
      {} as unknown as EntityRepository<Department>,
      {
        count: jest.fn(() => Promise.resolve(0)),
      } as unknown as EntityRepository<LeaveRequest>,
      {
        removeAndFlush: jest.fn(() => Promise.resolve(undefined)),
      } as unknown as EntityManager,
    );

    await expect(svc.remove(999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException when deleting an ADMIN account', async () => {
    const adminStaff = createStaff(42);

    const staffRepository = {
      findOne: jest.fn(() => Promise.resolve(adminStaff)),
      count: jest.fn(),
    };

    const em = { removeAndFlush: jest.fn() };

    const svc = new StaffsService(
      staffRepository as unknown as EntityRepository<Staff>,
      {} as unknown as EntityRepository<Role>,
      {} as unknown as EntityRepository<Department>,
      {
        count: jest.fn(() => Promise.resolve(0)),
      } as unknown as EntityRepository<LeaveRequest>,
      em as unknown as EntityManager,
    );

    await expect(svc.remove(42, 99)).rejects.toBeInstanceOf(ConflictException);
    expect(staffRepository.count).not.toHaveBeenCalled();
    expect(em.removeAndFlush).not.toHaveBeenCalled();
  });

  it('throws ConflictException when staff has leave requests as employee', async () => {
    const staff = createStaff(5);
    staff.role = Object.assign(new Role(), { id: 2, name: 'STAFF' });

    const staffRepository = {
      findOne: jest.fn(() => Promise.resolve(staff)),
      count: jest.fn(() => Promise.resolve(0)),
    };

    const leaveRequestRepository = {
      count: jest.fn(
        (filter: { staff?: number; resolvedByStaff?: number }) =>
          Promise.resolve('staff' in filter && filter.staff === 5 ? 1 : 0),
      ),
    };

    const em = { removeAndFlush: jest.fn() };

    const svc = new StaffsService(
      staffRepository as unknown as EntityRepository<Staff>,
      {} as unknown as EntityRepository<Role>,
      {} as unknown as EntityRepository<Department>,
      leaveRequestRepository as unknown as EntityRepository<LeaveRequest>,
      em as unknown as EntityManager,
    );

    await expect(svc.remove(5)).rejects.toBeInstanceOf(ConflictException);
    expect(em.removeAndFlush).not.toHaveBeenCalled();
  });

  it('throws ConflictException when staff has processed leave requests', async () => {
    const staff = createStaff(6);
    staff.role = Object.assign(new Role(), { id: 2, name: 'MANAGER' });

    const staffRepository = {
      findOne: jest.fn(() => Promise.resolve(staff)),
      count: jest.fn(() => Promise.resolve(0)),
    };

    const leaveRequestRepository = {
      count: jest
        .fn()
        .mockImplementationOnce(
          (filter: { staff?: number; resolvedByStaff?: number }) =>
            Promise.resolve(
              'staff' in filter && filter.staff === 6 ? 0 : 0,
            ),
        )
        .mockImplementationOnce(
          (filter: { staff?: number; resolvedByStaff?: number }) =>
            Promise.resolve(
              'resolvedByStaff' in filter && filter.resolvedByStaff === 6
                ? 1
                : 0,
            ),
        ),
    };

    const em = { removeAndFlush: jest.fn() };

    const svc = new StaffsService(
      staffRepository as unknown as EntityRepository<Staff>,
      {} as unknown as EntityRepository<Role>,
      {} as unknown as EntityRepository<Department>,
      leaveRequestRepository as unknown as EntityRepository<LeaveRequest>,
      em as unknown as EntityManager,
    );

    await expect(svc.remove(6)).rejects.toBeInstanceOf(ConflictException);
    expect(em.removeAndFlush).not.toHaveBeenCalled();
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
      {} as unknown as EntityRepository<Department>,
      {} as unknown as EntityRepository<LeaveRequest>,
      {} as unknown as EntityManager,
    );

    return { svc, staffRepository };
  }

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

describe('StaffsService.create (department rule)', () => {
  it('throws NotFoundException when departmentId does not exist', async () => {
    const staffRepository = {
      findOne: jest.fn(() => Promise.resolve(null)),
    };
    const roleRepository = {
      findOne: jest.fn(() =>
        Promise.resolve(Object.assign(new Role(), { id: 1, name: 'STAFF' })),
      ),
    };
    const departmentRepository = {
      findOne: jest.fn(() => Promise.resolve(null)),
    };

    const svc = new StaffsService(
      staffRepository as unknown as EntityRepository<Staff>,
      roleRepository as unknown as EntityRepository<Role>,
      departmentRepository as unknown as EntityRepository<Department>,
      {} as unknown as EntityRepository<LeaveRequest>,
      {} as unknown as EntityManager,
    );

    await expect(
      svc.create(
        {
          fullName: 'New Staff',
          email: 'new@company.local',
          password: '12345678',
          roleId: 1,
          departmentId: 999,
        },
        {
          id: 1,
          email: 'admin@company.local',
          fullName: 'Admin',
          leaveCredit: 12,
          role: 'ADMIN',
          departmentId: null,
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(departmentRepository.findOne).toHaveBeenCalledWith({ id: 999 });
  });

  it('throws BadRequestException when a non-admin role has no department', async () => {
    const staffRepository = {
      findOne: jest.fn(() => Promise.resolve(null)),
    };
    const roleRepository = {
      findOne: jest.fn(() =>
        Promise.resolve(Object.assign(new Role(), { id: 1, name: 'STAFF' })),
      ),
    };

    const svc = new StaffsService(
      staffRepository as unknown as EntityRepository<Staff>,
      roleRepository as unknown as EntityRepository<Role>,
      { findOne: jest.fn() } as unknown as EntityRepository<Department>,
      {} as unknown as EntityRepository<LeaveRequest>,
      {} as unknown as EntityManager,
    );

    await expect(
      svc.create(
        {
          fullName: 'No Dept',
          email: 'nodept@company.local',
          password: '12345678',
          roleId: 1,
        },
        {
          id: 1,
          email: 'admin@company.local',
          fullName: 'Admin',
          leaveCredit: 12,
          role: 'ADMIN',
          departmentId: null,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws ConflictException when department already has a MANAGER', async () => {
    const managerStaff = Object.assign(new Staff(), { id: 1 });
    const staffRepository = {
      findOne: jest.fn(() => Promise.resolve(null)),
      count: jest.fn(() => Promise.resolve(1)),
      create: jest.fn(() => managerStaff),
    };
    const roleRepository = {
      findOne: jest.fn(() =>
        Promise.resolve(Object.assign(new Role(), { id: 2, name: 'MANAGER' })),
      ),
    };
    const departmentRepository = {
      findOne: jest.fn(() =>
        Promise.resolve(Object.assign(new Department(), { id: 5, name: 'IT' })),
      ),
    };

    const svc = new StaffsService(
      staffRepository as unknown as EntityRepository<Staff>,
      roleRepository as unknown as EntityRepository<Role>,
      departmentRepository as unknown as EntityRepository<Department>,
      {} as unknown as EntityRepository<LeaveRequest>,
      {} as unknown as EntityManager,
    );

    await expect(
      svc.create(
        {
          fullName: 'Second Manager',
          email: 'manager2@company.local',
          password: '12345678',
          roleId: 2,
          departmentId: 5,
        },
        {
          id: 99,
          email: 'admin@company.local',
          fullName: 'Admin',
          leaveCredit: 12,
          role: 'ADMIN',
          departmentId: null,
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(staffRepository.count).toHaveBeenCalledWith({
      role: { name: 'MANAGER' },
      department: 5,
    });
  });
});

describe('StaffsService.update (MANAGER rule)', () => {
  it('throws ConflictException when promoting to MANAGER in a dept that already has one', async () => {
    const department = Object.assign(new Department(), { id: 5, name: 'IT' });
    const target = Object.assign(new Staff(), {
      id: 2,
      role: Object.assign(new Role(), { id: 1, name: 'STAFF' }),
      department,
    });

    const staffRepository = {
      findOne: jest.fn(() => Promise.resolve(target)),
      count: jest.fn(() => Promise.resolve(1)),
    };
    const roleRepository = {
      findOne: jest.fn(() =>
        Promise.resolve(Object.assign(new Role(), { id: 2, name: 'MANAGER' })),
      ),
    };

    const svc = new StaffsService(
      staffRepository as unknown as EntityRepository<Staff>,
      roleRepository as unknown as EntityRepository<Role>,
      { findOne: jest.fn() } as unknown as EntityRepository<Department>,
      {} as unknown as EntityRepository<LeaveRequest>,
      { flush: jest.fn(), populate: jest.fn() } as unknown as EntityManager,
    );

    await expect(svc.update(2, { roleId: 2 })).rejects.toBeInstanceOf(
      ConflictException,
    );
    // Existing MANAGER count excludes the staff being updated.
    expect(staffRepository.count).toHaveBeenCalledWith({
      role: { name: 'MANAGER' },
      department: 5,
      id: { $ne: 2 },
    });
  });
});

describe('StaffsService department scoping', () => {
  it('findAll filters by the MANAGER requester department', async () => {
    const staffRepository = {
      find: jest.fn(() => Promise.resolve([])),
      count: jest.fn(() => Promise.resolve(0)),
    };

    const svc = new StaffsService(
      staffRepository as unknown as EntityRepository<Staff>,
      {} as unknown as EntityRepository<Role>,
      {} as unknown as EntityRepository<Department>,
      {} as unknown as EntityRepository<LeaveRequest>,
      {} as unknown as EntityManager,
    );

    await svc.findAll(1, 10, {
      id: 9,
      email: 'mgr@company.local',
      fullName: 'Manager',
      leaveCredit: 12,
      role: 'MANAGER',
      departmentId: 7,
    });

    // MANAGER is scoped to their department AND cannot see ADMIN.
    const expectedManagerFilter = {
      department: 7,
      role: { name: { $nin: ['ADMIN'] } },
    };
    expect(staffRepository.find).toHaveBeenCalledWith(
      expectedManagerFilter,
      expect.anything(),
    );
    expect(staffRepository.count).toHaveBeenCalledWith(expectedManagerFilter);
  });

  it('findAll hides ADMIN from a STAFF requester (across all departments)', async () => {
    const staffRepository = {
      find: jest.fn(() => Promise.resolve([])),
      count: jest.fn(() => Promise.resolve(0)),
    };

    const svc = new StaffsService(
      staffRepository as unknown as EntityRepository<Staff>,
      {} as unknown as EntityRepository<Role>,
      {} as unknown as EntityRepository<Department>,
      {} as unknown as EntityRepository<LeaveRequest>,
      {} as unknown as EntityManager,
    );

    await svc.findAll(1, 10, {
      id: 11,
      email: 'staff@company.local',
      fullName: 'Staff',
      leaveCredit: 12,
      role: 'STAFF',
      departmentId: 7,
    });

    const expectedStaffFilter = { role: { name: { $nin: ['ADMIN'] } } };
    expect(staffRepository.find).toHaveBeenCalledWith(
      expectedStaffFilter,
      expect.anything(),
    );
    expect(staffRepository.count).toHaveBeenCalledWith(expectedStaffFilter);
  });

  it('findAll throws Forbidden for a MANAGER without a department', async () => {
    const svc = new StaffsService(
      { find: jest.fn(), count: jest.fn() } as unknown as EntityRepository<Staff>,
      {} as unknown as EntityRepository<Role>,
      {} as unknown as EntityRepository<Department>,
      {} as unknown as EntityRepository<LeaveRequest>,
      {} as unknown as EntityManager,
    );

    await expect(
      svc.findAll(1, 10, {
        id: 4,
        email: 'mgr@company.local',
        fullName: 'Manager',
        leaveCredit: 12,
        role: 'MANAGER',
        departmentId: null,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('findById forbids a MANAGER from viewing another department staff', async () => {
    const target = Object.assign(new Staff(), {
      id: 3,
      fullName: 'Other',
      email: 'other@company.local',
      role: Object.assign(new Role(), { id: 1, name: 'STAFF' }),
      department: Object.assign(new Department(), { id: 2, name: 'HR' }),
      leaveCredit: 12,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
    });
    const staffRepository = {
      findOne: jest.fn(() => Promise.resolve(target)),
    };

    const svc = new StaffsService(
      staffRepository as unknown as EntityRepository<Staff>,
      {} as unknown as EntityRepository<Role>,
      {} as unknown as EntityRepository<Department>,
      {} as unknown as EntityRepository<LeaveRequest>,
      {} as unknown as EntityManager,
    );

    await expect(
      svc.findById(3, {
        id: 9,
        email: 'mgr@company.local',
        fullName: 'Manager',
        leaveCredit: 12,
        role: 'MANAGER',
        departmentId: 7,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('findById hides an ADMIN from a MANAGER', async () => {
    const target = Object.assign(new Staff(), {
      id: 1,
      fullName: 'Admin',
      email: 'admin@company.local',
      role: Object.assign(new Role(), { id: 4, name: 'ADMIN' }),
      department: undefined,
      leaveCredit: 12,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
    });
    const staffRepository = {
      findOne: jest.fn(() => Promise.resolve(target)),
    };

    const svc = new StaffsService(
      staffRepository as unknown as EntityRepository<Staff>,
      {} as unknown as EntityRepository<Role>,
      {} as unknown as EntityRepository<Department>,
      {} as unknown as EntityRepository<LeaveRequest>,
      {} as unknown as EntityManager,
    );

    await expect(
      svc.findById(1, {
        id: 9,
        email: 'mgr@company.local',
        fullName: 'Manager',
        leaveCredit: 12,
        role: 'MANAGER',
        departmentId: 7,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findAll does not filter for ADMIN requester', async () => {
    const staffRepository = {
      find: jest.fn(() => Promise.resolve([])),
      count: jest.fn(() => Promise.resolve(0)),
    };

    const svc = new StaffsService(
      staffRepository as unknown as EntityRepository<Staff>,
      {} as unknown as EntityRepository<Role>,
      {} as unknown as EntityRepository<Department>,
      {} as unknown as EntityRepository<LeaveRequest>,
      {} as unknown as EntityManager,
    );

    await svc.findAll(1, 10, {
      id: 1,
      email: 'admin@company.local',
      fullName: 'Admin',
      leaveCredit: 12,
      role: 'ADMIN',
      departmentId: null,
    });

    expect(staffRepository.find).toHaveBeenCalledWith({}, expect.anything());
  });

  it('create forces a MANAGER to use their own department', async () => {
    const created = Object.assign(new Staff(), {
      id: 50,
      fullName: 'New Member',
      email: 'member@company.local',
      role: Object.assign(new Role(), { id: 1, name: 'STAFF' }),
      department: Object.assign(new Department(), { id: 7, name: 'IT' }),
      leaveCredit: 12,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
    });
    const staffRepository = {
      findOne: jest.fn(() => Promise.resolve(null)),
      create: jest.fn(() => created),
    };
    const roleRepository = {
      findOne: jest.fn(() =>
        Promise.resolve(Object.assign(new Role(), { id: 1, name: 'STAFF' })),
      ),
    };
    const departmentRepository = {
      findOne: jest.fn(({ id }: { id: number }) =>
        Promise.resolve(Object.assign(new Department(), { id, name: 'IT' })),
      ),
    };
    const em = {
      persistAndFlush: jest.fn(() => Promise.resolve(undefined)),
      populate: jest.fn(() => Promise.resolve(undefined)),
    };
    // findEntityById(creator) is called for createdBy; reuse staffRepository.findOne.
    staffRepository.findOne = jest
      .fn()
      .mockResolvedValueOnce(null) // email uniqueness check
      .mockResolvedValueOnce(Object.assign(new Staff(), { id: 9 })); // creator entity

    const svc = new StaffsService(
      staffRepository as unknown as EntityRepository<Staff>,
      roleRepository as unknown as EntityRepository<Role>,
      departmentRepository as unknown as EntityRepository<Department>,
      {} as unknown as EntityRepository<LeaveRequest>,
      em as unknown as EntityManager,
    );

    await svc.create(
      {
        fullName: 'New Member',
        email: 'member@company.local',
        password: '12345678',
        roleId: 1,
        departmentId: 99, // should be ignored in favour of the manager's dept
      },
      {
        id: 9,
        email: 'mgr@company.local',
        fullName: 'Manager',
        leaveCredit: 12,
        role: 'MANAGER',
        departmentId: 7,
      },
    );

    // Department resolved is the manager's (7), not the requested 99.
    expect(departmentRepository.findOne).toHaveBeenCalledWith({ id: 7 });
    expect(departmentRepository.findOne).not.toHaveBeenCalledWith({ id: 99 });
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
  staff.role = role;
  staff.leaveCredit = 12;
  staff.createdAt = new Date();
  staff.updatedAt = new Date();
  return staff;
}

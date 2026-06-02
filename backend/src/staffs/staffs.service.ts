import { EntityManager } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Department } from '../database/entities/department.entity';
import { LeaveRequest } from '../database/entities/leave-request.entity';
import { Role } from '../database/entities/role.entity';
import { Staff } from '../database/entities/staff.entity';
import { PaginationMetaDto } from '../common/dto/success-response.dto';
import type { AuthenticatedStaff } from '../auth/auth.types';
import { CreateStaffDto } from './dto/create-staff.dto';
import { RoleResponseDto } from './dto/role-response.dto';
import { StaffResponseDto } from './dto/staff-response.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffsService {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: EntityRepository<Staff>,
    @InjectRepository(Role)
    private readonly roleRepository: EntityRepository<Role>,
    @InjectRepository(Department)
    private readonly departmentRepository: EntityRepository<Department>,
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: EntityRepository<LeaveRequest>,
    private readonly em: EntityManager,
  ) {}

  async findAll(
    page = 1,
    limit = 10,
    requester?: AuthenticatedStaff,
  ): Promise<{ data: StaffResponseDto[]; meta: PaginationMetaDto }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;
    // MANAGER only sees staff within their own department.
    const filter = this.buildStaffListFilter(requester);
    const [staffs, totalItems] = await Promise.all([
      this.staffRepository.find(filter, {
        limit: safeLimit,
        offset,
        populate: ['role', 'department'],
      }),
      this.staffRepository.count(filter),
    ]);
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / safeLimit);
    return {
      data: staffs.map((staff) => this.toResponse(staff)),
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
    requester?: AuthenticatedStaff,
  ): Promise<StaffResponseDto> {
    const staff = await this.findEntityById(id);
    if (requester) {
      const role = requester.role.toUpperCase();
      // Hide higher-privilege roles entirely (NotFound to avoid leaking existence).
      if (
        this.getHiddenRolesForRequester(role).includes(
          staff.role.name.toUpperCase(),
        )
      ) {
        throw new NotFoundException('Staff not found');
      }
      // MANAGER may only view staff inside their own department.
      if (
        role === 'MANAGER' &&
        staff.department?.id !== requester.departmentId
      ) {
        throw new ForbiddenException(
          'You can only view staff from your own department',
        );
      }
    }
    return this.toResponse(staff);
  }

  async findEntityById(id: number): Promise<Staff> {
    const staff = await this.staffRepository.findOne(
      { id },
      { populate: ['role', 'department'] },
    );
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    return staff;
  }

  async findByEmailWithPassword(email: string): Promise<Staff | null> {
    return this.staffRepository.findOne(
      { email: this.normalizeEmail(email) },
      { populate: ['role', 'department'] },
    );
  }

  async findRoles(): Promise<RoleResponseDto[]> {
    const roles = await this.roleRepository.findAll({
      orderBy: { id: 'ASC' },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
    }));
  }

  async create(
    dto: CreateStaffDto,
    creator: AuthenticatedStaff,
  ): Promise<StaffResponseDto> {
    await this.ensureEmailUnique(dto.email);
    const role = await this.resolveRole(dto.roleId);
    await this.assertCanCreateRole(creator.role, role.name);
    // A MANAGER can only create staff inside their own department.
    let departmentId = dto.departmentId;
    if (creator.role.toUpperCase() === 'MANAGER') {
      if (typeof creator.departmentId !== 'number') {
        throw new ForbiddenException('No department assigned to your account');
      }
      departmentId = creator.departmentId;
    }
    const department = await this.resolveDepartmentForRole(
      role.name,
      departmentId,
    );
    if (department && role.name.toUpperCase() === 'MANAGER') {
      await this.ensureSingleManager(department.id);
    }

    const creatorEntity = await this.findEntityById(creator.id);

    const staff = this.staffRepository.create({
      fullName: dto.fullName.trim(),
      email: dto.email.toLowerCase(),
      passwordHash: await this.hashPassword(dto.password),
      role,
      department,
      leaveCredit: dto.leaveCredit ?? 12,
      createdBy: creatorEntity,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.em.persistAndFlush(staff);
    await this.em.populate(staff, ['role', 'department']);
    return this.toResponse(staff);
  }

  async update(id: number, dto: UpdateStaffDto): Promise<StaffResponseDto> {
    const staff = await this.findEntityById(id);

    if (dto.email && dto.email.toLowerCase() !== staff.email) {
      await this.ensureEmailUnique(dto.email);
      staff.email = dto.email.toLowerCase();
    }

    if (dto.fullName) {
      staff.fullName = dto.fullName.trim();
    }

    if (dto.password) {
      staff.passwordHash = await this.hashPassword(dto.password);
    }

    if (typeof dto.leaveCredit === 'number') {
      staff.leaveCredit = dto.leaveCredit;
    }

    if (dto.roleId) {
      staff.role = await this.resolveRole(dto.roleId);
    }

    if (typeof dto.departmentId === 'number') {
      staff.department = await this.resolveDepartment(dto.departmentId);
    }

    const roleName = staff.role.name.toUpperCase();
    if (roleName === 'ADMIN') {
      // ADMIN does not belong to a department; clear any assignment.
      staff.department = undefined;
    } else {
      // Every non-admin role must end up with a department.
      if (!staff.department) {
        throw new BadRequestException('Department is required for this role');
      }
      if (roleName === 'MANAGER') {
        // Enforce a single MANAGER per department, ignoring this staff itself.
        await this.ensureSingleManager(staff.department.id, staff.id);
      }
    }

    await this.em.flush();
    await this.em.populate(staff, ['role', 'department']);
    return this.toResponse(staff);
  }

  async remove(id: number, requesterId?: number): Promise<void> {
    if (typeof requesterId === 'number' && requesterId === id) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    const staff = await this.findEntityById(id);

    if (staff.role.name.toUpperCase() === 'ADMIN') {
      throw new ConflictException('Cannot delete an ADMIN account');
    }

    const createdStaffCount = await this.staffRepository.count({
      createdBy: id,
    });
    if (createdStaffCount > 0) {
      throw new ConflictException(
        'Cannot delete staff who created other staff records',
      );
    }

    const leaveRequestsAsEmployee = await this.leaveRequestRepository.count({
      staff: id,
    });
    if (leaveRequestsAsEmployee > 0) {
      throw new ConflictException(
        'Cannot delete staff who has leave requests',
      );
    }

    const leaveRequestsResolved = await this.leaveRequestRepository.count({
      resolvedByStaff: id,
    });
    if (leaveRequestsResolved > 0) {
      throw new ConflictException(
        'Cannot delete staff who has processed leave requests',
      );
    }
    await this.em.removeAndFlush(staff);
  }

  private async resolveRole(roleId?: number): Promise<Role> {
    if (roleId) {
      const role = await this.roleRepository.findOne({ id: roleId });
      if (!role) {
        throw new NotFoundException('Role not found');
      }

      return role;
    }

    const defaultRole = await this.roleRepository.findOne({ name: 'STAFF' });
    if (!defaultRole) {
      throw new NotFoundException(
        'Default role STAFF not found. Seed roles before creating staff.',
      );
    }

    return defaultRole;
  }

  /**
   * Builds the staff-list filter for the requester:
   * - MANAGER: scoped to their own department, with ADMIN accounts hidden.
   * - STAFF: all departments, with ADMIN accounts hidden.
   * - ADMIN / unauthenticated (no requester): no filter, sees everything.
   */
  private buildStaffListFilter(
    requester?: AuthenticatedStaff,
  ): Record<string, unknown> {
    if (!requester) {
      return {};
    }
    const role = requester.role.toUpperCase();
    const filter: Record<string, unknown> = {};

    if (role === 'MANAGER') {
      if (typeof requester.departmentId !== 'number') {
        // A MANAGER must have a department; never fall back to "see all".
        throw new ForbiddenException('No department assigned to your account');
      }
      filter.department = requester.departmentId;
    }

    // Hide ADMIN accounts from MANAGER and STAFF requesters.
    const hiddenRoles = this.getHiddenRolesForRequester(role);
    if (hiddenRoles.length > 0) {
      filter.role = { name: { $nin: hiddenRoles } };
    }

    return filter;
  }

  /**
   * Roles a requester is not allowed to see. MANAGER and STAFF never see
   * ADMIN. ADMIN sees everyone.
   */
  private getHiddenRolesForRequester(role: string): string[] {
    switch (role.toUpperCase()) {
      case 'MANAGER':
      case 'STAFF':
        return ['ADMIN'];
      default:
        return [];
    }
  }

  /**
   * Recipients notified for a new leave request: the MANAGER(s) of the
   * requester's department. Only those with an email. If the department has
   * no manager (or the requester has no department), nobody is notified.
   */
  async findLeaveApprovers(departmentId: number | null): Promise<Staff[]> {
    if (typeof departmentId !== 'number') {
      return [];
    }

    const managers = await this.staffRepository.find(
      { role: { name: 'MANAGER' }, department: departmentId },
      { populate: ['role', 'department'] },
    );
    return managers.filter((staff) => Boolean(staff.email?.trim()));
  }

  private async resolveDepartment(departmentId: number): Promise<Department> {
    const department = await this.departmentRepository.findOne({
      id: departmentId,
    });
    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  /**
   * ADMIN is exempt from departments (returns undefined even if an id is sent).
   * Every other role must be assigned to an existing department.
   */
  private async resolveDepartmentForRole(
    roleName: string,
    departmentId?: number,
  ): Promise<Department | undefined> {
    if (roleName.toUpperCase() === 'ADMIN') {
      return undefined;
    }

    if (!departmentId) {
      throw new BadRequestException('Department is required for this role');
    }

    return this.resolveDepartment(departmentId);
  }

  /**
   * Guarantees a department has at most one MANAGER. Pass excludeStaffId when
   * updating an existing staff so the staff is not counted against itself.
   */
  private async ensureSingleManager(
    departmentId: number,
    excludeStaffId?: number,
  ): Promise<void> {
    const where: Record<string, unknown> = {
      role: { name: 'MANAGER' },
      department: departmentId,
    };
    if (typeof excludeStaffId === 'number') {
      where.id = { $ne: excludeStaffId };
    }

    const existingManager = await this.staffRepository.count(where);
    if (existingManager > 0) {
      throw new ConflictException('Department already has a MANAGER');
    }
  }

  private async ensureEmailUnique(email: string): Promise<void> {
    const existingStaff = await this.staffRepository.findOne({
      email: email.toLowerCase(),
    });

    if (existingStaff) {
      throw new ConflictException('Email already exists');
    }
  }

  private hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private toResponse(staff: Staff): StaffResponseDto {
    return {
      id: staff.id,
      fullName: staff.fullName,
      email: staff.email,
      role: staff.role.name,
      department: staff.department?.name ?? null,
      leaveCredit: Number(staff.leaveCredit),
      createdAt: staff.createdAt.toISOString(),
    };
  }

  private async assertCanCreateRole(
    creatorRole: string,
    targetRole: string,
  ): Promise<void> {
    const normalizedCreator = creatorRole.toUpperCase();
    const normalizedTarget = targetRole.toUpperCase();

    if (normalizedTarget === 'ADMIN') {
      const adminCount = await this.staffRepository.count({
        role: { name: 'ADMIN' },
      });
      if (adminCount > 0) {
        throw new ConflictException('Only one ADMIN is allowed');
      }
    }

    const allowedTargetsByCreator: Record<string, Set<string>> = {
      ADMIN: new Set(['ADMIN', 'MANAGER', 'STAFF']),
      MANAGER: new Set(['STAFF']),
    };

    const allowedTargets = allowedTargetsByCreator[normalizedCreator];
    if (!allowedTargets || !allowedTargets.has(normalizedTarget)) {
      throw new ForbiddenException('Not allowed to create this role');
    }
  }
}

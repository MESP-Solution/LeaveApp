import { EntityManager } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
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
    @InjectRepository(LeaveRequest)
    private readonly leaveRequestRepository: EntityRepository<LeaveRequest>,
    private readonly em: EntityManager,
  ) {}

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{ data: StaffResponseDto[]; meta: PaginationMetaDto }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;
    const [staffs, totalItems] = await Promise.all([
      this.staffRepository.findAll({
        limit: safeLimit,
        offset,
        populate: ['role'],
      }),
      this.staffRepository.count({}),
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

  async findById(id: number): Promise<StaffResponseDto> {
    const staff = await this.findEntityById(id);
    return this.toResponse(staff);
  }

  async findEntityById(id: number): Promise<Staff> {
    const staff = await this.staffRepository.findOne(
      { id },
      { populate: ['role'] },
    );
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    return staff;
  }

  async findByEmailWithPassword(email: string): Promise<Staff | null> {
    return this.staffRepository.findOne(
      { email: this.normalizeEmail(email) },
      { populate: ['role'] },
    );
  }

  async findByRoleName(roleName: string): Promise<Staff[]> {
    return this.staffRepository.find(
      { role: { name: roleName } },
      { populate: ['role'] },
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
    await this.ensureSmtpPassUnique(dto.smtpPass);
    const role = await this.resolveRole(dto.roleId);
    await this.assertCanCreateRole(creator.role, role.name);

    const creatorEntity = await this.findEntityById(creator.id);

    const staff = this.staffRepository.create({
      fullName: dto.fullName.trim(),
      email: dto.email.toLowerCase(),
      passwordHash: await this.hashPassword(dto.password),
      smtpPass: dto.smtpPass.trim(),
      role,
      leaveCredit: dto.leaveCredit ?? 12,
      createdBy: creatorEntity,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.em.persistAndFlush(staff);
    await this.em.populate(staff, ['role']);
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

    if (dto.smtpPass && dto.smtpPass !== staff.smtpPass) {
      await this.ensureSmtpPassUnique(dto.smtpPass);
      staff.smtpPass = dto.smtpPass.trim();
    }

    if (typeof dto.leaveCredit === 'number') {
      staff.leaveCredit = dto.leaveCredit;
    }

    if (dto.roleId) {
      staff.role = await this.resolveRole(dto.roleId);
    }

    await this.em.flush();
    await this.em.populate(staff, ['role']);
    return this.toResponse(staff);
  }

  async remove(id: number, requesterId?: number): Promise<void> {
    if (typeof requesterId === 'number' && requesterId === id) {
      throw new ForbiddenException('Cannot delete your own account');
    }

    const staff = await this.findEntityById(id);
    const createdStaffCount = await this.staffRepository.count({
      createdBy: id,
    });
    if (createdStaffCount > 0) {
      throw new ConflictException(
        'Cannot delete staff who created other staff records',
      );
    }
    const leaveRequestCount = await this.leaveRequestRepository.count({
      $or: [{ staff: id }, { resolvedByStaff: id }],
    });
    if (leaveRequestCount > 0) {
      throw new ConflictException(
        'Cannot delete staff with leave request history',
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

  private async ensureEmailUnique(email: string): Promise<void> {
    const existingStaff = await this.staffRepository.findOne({
      email: email.toLowerCase(),
    });

    if (existingStaff) {
      throw new ConflictException('Email already exists');
    }
  }

  private async ensureSmtpPassUnique(smtpPass: string): Promise<void> {
    const existingStaff = await this.staffRepository.findOne({
      smtpPass: smtpPass.trim(),
    });

    if (existingStaff) {
      throw new ConflictException('SMTP password already exists');
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
      ADMIN: new Set(['ADMIN', 'HEAD', 'MANAGER', 'STAFF']),
      HEAD: new Set(['HEAD', 'MANAGER', 'STAFF']),
      MANAGER: new Set(['STAFF']),
    };

    const allowedTargets = allowedTargetsByCreator[normalizedCreator];
    if (!allowedTargets || !allowedTargets.has(normalizedTarget)) {
      throw new ForbiddenException('Not allowed to create this role');
    }
  }
}

import { createHash } from 'node:crypto';
import { EntityManager } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../database/entities/role.entity';
import { Staff } from '../database/entities/staff.entity';
import { CreateStaffDto } from './dto/create-staff.dto';
import { StaffResponseDto } from './dto/staff-response.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffsService {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: EntityRepository<Staff>,
    @InjectRepository(Role)
    private readonly roleRepository: EntityRepository<Role>,
    private readonly em: EntityManager,
  ) {}

  async findAll(): Promise<StaffResponseDto[]> {
    const staffs = await this.staffRepository.findAll({ populate: ['role'] });
    return staffs.map((staff) => this.toResponse(staff));
  }

  async findById(id: number): Promise<StaffResponseDto> {
    const staff = await this.findStaffEntity(id);
    return this.toResponse(staff);
  }

  async create(dto: CreateStaffDto): Promise<StaffResponseDto> {
    await this.ensureEmailUnique(dto.email);
    const role = await this.resolveRole(dto.roleId);

    const staff = this.staffRepository.create({
      fullName: dto.fullName.trim(),
      email: dto.email.toLowerCase(),
      passwordHash: this.hashPassword(dto.password),
      role,
      leaveCredit: dto.leaveCredit ?? 12,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.em.persistAndFlush(staff);
    await this.em.populate(staff, ['role']);
    return this.toResponse(staff);
  }

  async update(id: number, dto: UpdateStaffDto): Promise<StaffResponseDto> {
    const staff = await this.findStaffEntity(id);

    if (dto.email && dto.email.toLowerCase() !== staff.email) {
      await this.ensureEmailUnique(dto.email);
      staff.email = dto.email.toLowerCase();
    }

    if (dto.fullName) {
      staff.fullName = dto.fullName.trim();
    }

    if (dto.password) {
      staff.passwordHash = this.hashPassword(dto.password);
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

  async remove(id: number): Promise<void> {
    const staff = await this.findStaffEntity(id);
    await this.em.removeAndFlush(staff);
  }

  private async findStaffEntity(id: number): Promise<Staff> {
    const staff = await this.staffRepository.findOne(
      { id },
      { populate: ['role'] },
    );
    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    return staff;
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

  private hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }

  private toResponse(staff: Staff): StaffResponseDto {
    return {
      id: staff.id,
      fullName: staff.fullName,
      email: staff.email,
      role: staff.role.name,
      leaveCredit: staff.leaveCredit,
      createdAt: staff.createdAt.toISOString(),
    };
  }
}

import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/mysql';
import { Injectable } from '@nestjs/common';
import { Department } from '../database/entities/department.entity';
import { DepartmentResponseDto } from './dto/department-response.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: EntityRepository<Department>,
  ) {}

  async findAll(): Promise<DepartmentResponseDto[]> {
    const departments = await this.departmentRepository.findAll({
      orderBy: { name: 'ASC' },
    });

    return departments.map((department) => ({
      id: department.id,
      name: department.name,
      description: department.description ?? null,
    }));
  }
}

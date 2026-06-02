import { EntityRepository } from '@mikro-orm/mysql';
import { Department } from '../database/entities/department.entity';
import { DepartmentsService } from './departments.service';

describe('DepartmentsService.findAll', () => {
  it('maps department entities to response DTOs, ordered by name', async () => {
    const departments = [
      Object.assign(new Department(), {
        id: 1,
        name: 'IT',
        description: 'Information Technology',
      }),
      Object.assign(new Department(), {
        id: 2,
        name: 'Marketing',
        description: undefined,
      }),
    ];

    const departmentRepository = {
      findAll: jest.fn(() => Promise.resolve(departments)),
    };

    const svc = new DepartmentsService(
      departmentRepository as unknown as EntityRepository<Department>,
    );

    const result = await svc.findAll();

    expect(departmentRepository.findAll).toHaveBeenCalledWith({
      orderBy: { name: 'ASC' },
    });
    expect(result).toEqual([
      { id: 1, name: 'IT', description: 'Information Technology' },
      { id: 2, name: 'Marketing', description: null },
    ]);
  });
});

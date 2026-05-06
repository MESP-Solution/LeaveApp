import { Collection, Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';
import { Staff } from './staff.entity';

@Entity({ tableName: 'roles' })
export class Role {
  @PrimaryKey({ autoincrement: true, columnType: 'int unsigned' })
  id!: number;

  @Property({ length: 64, unique: true })
  name!: string;

  @OneToMany(() => Staff, (staff) => staff.role)
  staffs = new Collection<Staff>(this);
}

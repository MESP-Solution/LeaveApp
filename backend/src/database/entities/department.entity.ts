import {
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Staff } from './staff.entity';

@Entity({ tableName: 'departments' })
export class Department {
  @PrimaryKey({ autoincrement: true, columnType: 'int unsigned' })
  id!: number;

  @Property({ length: 64, unique: true })
  name!: string;

  @Property({ type: 'text', nullable: true })
  description?: string;

  @Property({ type: 'datetime', length: 3, defaultRaw: 'current_timestamp(3)' })
  createdAt!: Date;

  @Property({
    type: 'datetime',
    length: 3,
    defaultRaw: 'current_timestamp(3)',
    extra: 'on update current_timestamp(3)',
  })
  updatedAt!: Date;

  @OneToMany(() => Staff, (staff) => staff.department)
  staffs = new Collection<Staff>(this);
}

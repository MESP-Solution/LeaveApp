import {
  Collection,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { LeaveRequest } from './leave-request.entity';
import { Role } from './role.entity';

@Entity({ tableName: 'staffs' })
export class Staff {
  @PrimaryKey({ autoincrement: true, columnType: 'int unsigned' })
  id!: number;

  @Property({ length: 255 })
  fullName!: string;

  @Property({ length: 255, unique: true })
  email!: string;

  @Property({ length: 255, hidden: true })
  passwordHash!: string;

  @ManyToOne(() => Role, {
    joinColumn: 'role_id',
    inversedBy: (role: Role) => role.staffs,
  })
  role!: Role;

  @Property({ default: 12 })
  leaveCredit!: number;

  @ManyToOne(() => Staff, { nullable: true, joinColumn: 'created_by' })
  createdBy?: Staff;

  @Property({ type: 'datetime', length: 3, defaultRaw: 'current_timestamp(3)' })
  createdAt!: Date;

  @Property({
    type: 'datetime',
    length: 3,
    defaultRaw: 'current_timestamp(3)',
    extra: 'on update current_timestamp(3)',
  })
  updatedAt!: Date;

  @OneToMany(() => LeaveRequest, (leave) => leave.staff)
  leaveRequests = new Collection<LeaveRequest>(this);

  @OneToMany(() => LeaveRequest, (leave) => leave.resolvedByStaff)
  resolvedLeaveRequests = new Collection<LeaveRequest>(this);
}

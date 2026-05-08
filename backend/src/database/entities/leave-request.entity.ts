import { Entity, Enum, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { LeaveStatus } from '../enums/leave-status.enum';
import { TypeLeave } from '../enums/type-leave.enum';
import { Staff } from './staff.entity';

@Entity({ tableName: 'leave_requests' })
export class LeaveRequest {
  @PrimaryKey({ autoincrement: true, columnType: 'int unsigned' })
  id!: number;

  @ManyToOne(() => Staff, {
    joinColumn: 'staff_id',
    inversedBy: (staff: Staff) => staff.leaveRequests,
  })
  staff!: Staff;

  @Property({ type: 'date', columnType: 'date' })
  leaveDate!: string;

  @Enum({ items: () => TypeLeave, columnType: "enum('MORNING', 'AFTERNOON', 'FULL')" })
  type: TypeLeave = TypeLeave.FULL;

  @Property({ type: 'text' })
  reason!: string;

  @Enum({ items: () => LeaveStatus })
  status: LeaveStatus = LeaveStatus.PENDING;

  @ManyToOne(() => Staff, {
    nullable: true,
    joinColumn: 'resolved_by',
    inversedBy: (staff: Staff) => staff.resolvedLeaveRequests,
  })
  resolvedByStaff?: Staff;

  @Property({ type: 'text', nullable: true })
  rejectReason?: string;

  @Property({ type: 'datetime', length: 3, nullable: true })
  resolvedAt?: Date;

  @Property({ type: 'datetime', length: 3, defaultRaw: 'current_timestamp(3)' })
  createdAt!: Date;

  @Property({
    type: 'datetime',
    length: 3,
    defaultRaw: 'current_timestamp(3)',
    extra: 'on update current_timestamp(3)',
  })
  updatedAt!: Date;
}

import { TypeLeave } from '../database/enums/type-leave.enum';

export const LEAVE_REQUEST_STATUSES = [
  'pending',
  'approved',
  'rejected',
] as const;
export type LeaveRequestStatus = (typeof LEAVE_REQUEST_STATUSES)[number];

export interface LeaveRequest {
  id: number;
  rejectReason?: string;
  reason: string;
  processedAt?: string;
  resolvedByStaffId?: number;
  staffEmail: string;
  staffId: number;
  staffName: string;
  employeeEmail: string;
  employeeName: string;
  leaveDate: string;
  type: TypeLeave;
  status: LeaveRequestStatus;
  createdAt: string;
  staff: LeaveRequestUser;
  resolvedByStaff?: LeaveRequestUser;
}

export interface CreateLeaveRequestResponse {
  totalDays: number;
  requests: LeaveRequest[];
}

export interface LeaveRequestUser {
  id: number;
  fullName: string;
  email: string;
}

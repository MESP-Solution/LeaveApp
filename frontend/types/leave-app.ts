export const STAFF_ROLE_NAMES = ["STAFF", "MANAGER", "HEAD", "ADMIN"] as const;
export type StaffRoleName = (typeof STAFF_ROLE_NAMES)[number];

export const ERD_LEAVE_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ErdLeaveStatus = (typeof ERD_LEAVE_STATUSES)[number];

export const LEAVE_SESSIONS = ["MORNING", "AFTERNOON", "FULL"] as const;
export type LeaveSession = (typeof LEAVE_SESSIONS)[number];

export const EMAIL_STATUSES = ["SENT", "FAILED"] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export interface RoleRecord {
  id: number;
  name: StaffRoleName;
}

export interface StaffRecord {
  id: number;
  fullName: string;
  email: string;
  passwordHash?: string;
  roleId: number;
  leaveCredit: number;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequestRecord {
  id: number;
  staffId: number;
  leaveDate: string;
  type_leave: LeaveSession;
  reason: string;
  status: ErdLeaveStatus;
  resolvedBy?: number;
  rejectReason?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ManagerNotificationRecord {
  id: number;
  managerId: number;
  leaveRequestId: number;
  subject: string;
  emailStatus: EmailStatus;
  createdAt: string;
}

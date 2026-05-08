import type { ErdLeaveStatus, StaffRecord, StaffRoleName, LeaveRequestRecord } from "@/types/leave-app";
import { normalizeLeaveSession } from "./leave-session";

type StaffApiDto = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  leaveCredit: number;
  createdAt: string;
};

type LeaveRequestApiDto = {
  id: number;
  staffId: number;
  leaveDate: string;
  type?: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  rejectReason?: string;
  resolvedByStaffId?: number;
  processedAt?: string;
  createdAt: string;
};

export function mapStaffFromApi(dto: StaffApiDto): StaffRecord {
  return {
    id: dto.id,
    fullName: dto.fullName,
    email: dto.email,
    roleId: roleNameToId(dto.role),
    leaveCredit: dto.leaveCredit,
    createdAt: dto.createdAt,
    updatedAt: dto.createdAt,
  };
}

export function mapLeaveRequestFromApi(dto: LeaveRequestApiDto): LeaveRequestRecord {
  return {
    id: dto.id,
    staffId: dto.staffId,
    leaveDate: dto.leaveDate,
    type_leave: normalizeLeaveSession(dto.type),
    reason: dto.reason,
    status: mapLeaveStatus(dto.status),
    resolvedBy: dto.resolvedByStaffId,
    rejectReason: dto.rejectReason,
    resolvedAt: dto.processedAt,
    createdAt: dto.createdAt,
    updatedAt: dto.processedAt ?? dto.createdAt,
  };
}

export function roleNameToId(roleName: string): number {
  const roleIds: Record<StaffRoleName, number> = {
    ADMIN: 4,
    HEAD: 3,
    MANAGER: 2,
    STAFF: 1,
  };
  const normalized = roleName.toUpperCase() as StaffRoleName;
  return roleIds[normalized] ?? roleIds.STAFF;
}

function mapLeaveStatus(status: LeaveRequestApiDto["status"]): ErdLeaveStatus {
  switch (status) {
    case "approved":
      return "APPROVED";
    case "rejected":
      return "REJECTED";
    case "pending":
    default:
      return "PENDING";
  }
}

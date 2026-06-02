import type { StaffRecord, StaffRoleName } from "@/types/leave-app";

const ROLE_NAME_BY_ID: Record<number, StaffRoleName> = {
  1: "STAFF",
  2: "MANAGER",
  4: "ADMIN",
};

export function findRoleName(staff: StaffRecord): StaffRoleName {
  return ROLE_NAME_BY_ID[staff.roleId] ?? "STAFF";
}

export function findStaffName(staffs: StaffRecord[], staffId?: number): string {
  if (!staffId) {
    return "-";
  }

  return staffs.find((staff) => staff.id === staffId)?.fullName ?? "-";
}

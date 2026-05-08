import { leaveStatusLabel } from "@/lib/formatters";
import { findStaffName } from "@/lib/leave-app-helpers";
import { leaveSessionOptions } from "@/lib/leave-session";
import type { ErdLeaveStatus, LeaveRequestRecord, LeaveSession, StaffRecord } from "@/types/leave-app";

export type RequestFilterValues = {
  staffId: string;
  status: "" | ErdLeaveStatus;
  typeLeave: "" | LeaveSession;
};

export const defaultRequestFilters: RequestFilterValues = {
  staffId: "",
  status: "",
  typeLeave: "",
};

export function filterRequests(
  requests: LeaveRequestRecord[],
  filters: RequestFilterValues,
): LeaveRequestRecord[] {
  return requests.filter((request) => {
    const matchesStaff = !filters.staffId || request.staffId === Number(filters.staffId);
    const matchesStatus = !filters.status || request.status === filters.status;
    const matchesType = !filters.typeLeave || request.type_leave === filters.typeLeave;

    return matchesStaff && matchesStatus && matchesType;
  });
}

export function RequestFilters({
  filters,
  onChange,
  staffs,
}: {
  filters: RequestFilterValues;
  onChange: (filters: RequestFilterValues) => void;
  staffs: StaffRecord[];
}) {
  return (
    <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 sm:grid-cols-3">
      <label className={filterLabelClassName}>
        Nhân sự
        <select
          className={filterInputClassName}
          onChange={(event) => onChange({ ...filters, staffId: event.target.value })}
          value={filters.staffId}
        >
          <option value="">Tất cả nhân sự</option>
          {staffs.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {findStaffName(staffs, staff.id)}
            </option>
          ))}
        </select>
      </label>

      <label className={filterLabelClassName}>
        Trạng thái
        <select
          className={filterInputClassName}
          onChange={(event) =>
            onChange({ ...filters, status: event.target.value as RequestFilterValues["status"] })
          }
          value={filters.status}
        >
          <option value="">Tất cả trạng thái</option>
          {(["PENDING", "APPROVED", "REJECTED"] as const).map((status) => (
            <option key={status} value={status}>
              {leaveStatusLabel(status)}
            </option>
          ))}
        </select>
      </label>

      <label className={filterLabelClassName}>
        Buổi nghỉ
        <select
          className={filterInputClassName}
          onChange={(event) =>
            onChange({ ...filters, typeLeave: event.target.value as RequestFilterValues["typeLeave"] })
          }
          value={filters.typeLeave}
        >
          <option value="">Tất cả buổi nghỉ</option>
          {leaveSessionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

const filterLabelClassName = "grid gap-1 text-sm font-medium text-slate-700";
const filterInputClassName =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500";

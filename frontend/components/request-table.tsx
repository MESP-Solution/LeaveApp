import { useState } from "react";
import { formatDate, formatDateTime, leaveStatusLabel } from "@/lib/formatters";
import { findStaffName } from "@/lib/leave-app-helpers";
import { leaveSessionLabel } from "@/lib/leave-session";
import type { LeaveRequestRecord, StaffRecord } from "@/types/leave-app";
import { EmptyState } from "./empty-state";
import { LeaveCalendar } from "./leave-calendar";

const statusClasses: Record<LeaveRequestRecord["status"], string> = {
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING: "border-sky-200 bg-sky-50 text-sky-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
};

export function RequestTable({
  calendarRequests,
  requests,
  staffs,
  title,
  pagination,
  onRequestClick,
  onDateSelect,
  minSelectableDate,
}: {
  calendarRequests?: LeaveRequestRecord[];
  minSelectableDate?: string;
  requests: LeaveRequestRecord[];
  staffs: StaffRecord[];
  title: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (nextPage: number) => void | Promise<void>;
  };
  onDateSelect?: (dateKey: string) => void;
  onRequestClick?: (request: LeaveRequestRecord) => void;
}) {
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");
  const calendarSource = calendarRequests ?? requests;

  if (calendarSource.length === 0 && requests.length === 0) {
    return <EmptyState title="Chưa có đơn" description="Đơn nghỉ phép sẽ hiển thị tại đây." />;
  }

  const pageSize = pagination?.pageSize ?? requests.length;
  const page = pagination?.page ?? 1;
  const totalPages =
    pagination && pagination.total > 0
      ? Math.max(1, Math.ceil(pagination.total / pageSize))
      : 1;

  return (
    <div className="grid gap-4">
      <div className="relative">
        <div className="absolute right-0 top-0 z-10">
          <div className="inline-flex overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
            <button
              className={viewMode === "calendar" ? activeTabClassName : inactiveTabClassName}
              onClick={() => setViewMode("calendar")}
              type="button"
            >
              Lịch
            </button>
            <button
              className={`border-l border-slate-300 ${
                viewMode === "table" ? activeTabClassName : inactiveTabClassName
              }`}
              onClick={() => setViewMode("table")}
              type="button"
            >
              Bảng
            </button>
          </div>
        </div>

        <div className="pt-10">
          {viewMode === "calendar" ? (
            <LeaveCalendar
              minSelectableDate={minSelectableDate}
              onDateSelect={onDateSelect}
              onRequestClick={onRequestClick}
              requests={calendarSource}
              staffs={staffs}
            />
          ) : null}

          {viewMode === "table" ? (
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-base font-semibold text-slate-950">{title}</h2>
              </div>
              {pagination && totalPages > 1 ? (
                <PaginationControls page={page} pagination={pagination} totalPages={totalPages} />
              ) : null}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Nhân viên</th>
                      <th className="px-4 py-3 font-medium">Ngày nghỉ</th>
                      <th className="px-4 py-3 font-medium">Buổi</th>
                      <th className="px-4 py-3 font-medium">Lý do</th>
                      <th className="px-4 py-3 font-medium">Trạng thái</th>
                      <th className="px-4 py-3 font-medium">Xử lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requests.map((request) => (
                      <tr
                        className={`align-top ${onRequestClick ? "cursor-pointer hover:bg-slate-50" : ""}`}
                        key={request.id}
                        onClick={() => onRequestClick?.(request)}
                      >
                        <td className="px-4 py-3 font-medium text-slate-950">
                          {findStaffName(staffs, request.staffId)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{formatDate(request.leaveDate)}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {leaveSessionLabel(request.type_leave)}
                        </td>
                        <td className="max-w-sm px-4 py-3 text-slate-700">
                          {request.reason}
                          {request.rejectReason ? (
                            <p className="mt-2 text-xs text-rose-700">
                              Từ chối: {request.rejectReason}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${statusClasses[request.status]}`}
                          >
                            {leaveStatusLabel(request.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          <p>{findStaffName(staffs, request.resolvedBy)}</p>
                          <p>{formatDateTime(request.resolvedAt)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PaginationControls({
  page,
  pagination,
  totalPages,
}: {
  page: number;
  pagination: NonNullable<Parameters<typeof RequestTable>[0]["pagination"]>;
  totalPages: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2">
      <div className="text-sm text-slate-600">
        Trang <span className="font-medium text-slate-900">{page}</span> /{" "}
        <span className="font-medium text-slate-900">{totalPages}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          className={paginationButtonClassName}
          disabled={page <= 1}
          onClick={() => pagination.onPageChange(page - 1)}
          type="button"
        >
          Trước
        </button>
        <button
          className={paginationButtonClassName}
          disabled={page >= totalPages}
          onClick={() => pagination.onPageChange(page + 1)}
          type="button"
        >
          Sau
        </button>
      </div>
    </div>
  );
}

const activeTabClassName = "bg-slate-900 px-3 py-1 text-sm font-medium text-white";
const inactiveTabClassName =
  "bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50";
const paginationButtonClassName =
  "rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100";

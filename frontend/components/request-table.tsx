import { useMemo, useState } from "react";
import { Calendar, List, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { formatDate, formatDateTime, leaveStatusLabel } from "@/lib/formatters";
import { findStaffName } from "@/lib/leave-app-helpers";
import { leaveSessionLabel } from "@/lib/leave-session";
import type { LeaveRequestRecord, StaffRecord } from "@/types/leave-app";
import { EmptyState } from "./empty-state";
import { LeaveCalendar } from "./leave-calendar";
import {
  defaultRequestFilters,
  filterRequests,
  RequestFilters,
  type RequestFilterValues,
} from "./request-filters";
import { RequestPaginationControls } from "./request-pagination-controls";



export function RequestTable({
  calendarRequests,
  enableFilters = false,
  requests,
  staffs,
  title,
  pagination,
  onRequestClick,
  onDateSelect,
  minSelectableDate,
}: {
  calendarRequests?: LeaveRequestRecord[];
  enableFilters?: boolean;
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
  const [filters, setFilters] = useState<RequestFilterValues>(defaultRequestFilters);
  const [clientPage, setClientPage] = useState(1);
  const calendarSource = calendarRequests ?? requests;
  const filteredRequests = useMemo(
    () => (enableFilters ? filterRequests(calendarSource, filters, staffs) : calendarSource),
    [calendarSource, enableFilters, filters, staffs],
  );
  const clientPageSize = pagination?.pageSize ?? Math.max(requests.length, 1);
  const clientTotalPages = Math.max(1, Math.ceil(filteredRequests.length / clientPageSize));
  const activeClientPage = Math.min(clientPage, clientTotalPages);
  const displayedRequests = enableFilters
    ? filteredRequests.slice((activeClientPage - 1) * clientPageSize, activeClientPage * clientPageSize)
    : requests;
  const displayedPagination = enableFilters ? undefined : pagination;

  if (calendarSource.length === 0 && requests.length === 0) {
    return <EmptyState title="Chưa có đơn" description="Đơn nghỉ phép sẽ hiển thị tại đây." />;
  }

  const pageSize = enableFilters ? clientPageSize : displayedPagination?.pageSize ?? displayedRequests.length;
  const page = enableFilters ? activeClientPage : displayedPagination?.page ?? 1;
  const totalPages =
    enableFilters
      ? clientTotalPages
      : displayedPagination && displayedPagination.total > 0
        ? Math.max(1, Math.ceil(displayedPagination.total / pageSize))
        : 1;
  const shouldShowPagination = enableFilters
    ? filteredRequests.length > clientPageSize
    : Boolean(displayedPagination && totalPages > 1);

  return (
    <div className="grid gap-4">
      <div className="relative">
        <div className="absolute right-0 top-0 z-10 ">
          <div className="flex items-center gap-0.5 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/40 shadow-sm">
            <button
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer
                ${viewMode === "calendar"
                  ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-900"
                }
              `}
              onClick={() => setViewMode("calendar")}
              type="button"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Lịch</span>
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer
                ${viewMode === "table"
                  ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-900"
                }
              `}
              onClick={() => setViewMode("table")}
              type="button"
            >
              <List className="w-3.5 h-3.5" />
              <span>Bảng</span>
            </button>
          </div>
        </div>

        <div className="grid gap-3 pt-10">
          {enableFilters ? (
            <RequestFilters
              filters={filters}
              onChange={(nextFilters) => {
                setFilters(nextFilters);
                setClientPage(1);
              }}
            />
          ) : null}

          {viewMode === "calendar" ? (
            <LeaveCalendar
              minSelectableDate={minSelectableDate}
              onDateSelect={onDateSelect}
              onRequestClick={onRequestClick}
              requests={filteredRequests}
              staffs={staffs}
            />
          ) : null}

          {viewMode === "table" ? (
            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm mt-2">
              <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider">{title}</h2>
              </div>
              {shouldShowPagination ? (
                <div className="bg-slate-50/30 border-b border-slate-100 px-4 py-2">
                  <RequestPaginationControls
                    onPageChange={enableFilters ? setClientPage : displayedPagination!.onPageChange}
                    page={page}
                    totalPages={totalPages}
                  />
                </div>
              ) : null}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50/70 text-xs font-semibold text-slate-500 border-b border-slate-100/80">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Ngày nghỉ</th>
                      <th className="px-5 py-3 font-semibold">Buổi</th>
                      <th className="px-5 py-3 font-semibold">Lý do nghỉ</th>
                      <th className="px-5 py-3 font-semibold">Trạng thái</th>
                      <th className="px-5 py-3 font-semibold">Lịch sử xử lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedRequests.map((request) => (
                      <tr
                        className={`align-top transition-colors duration-150 ${onRequestClick ? "cursor-pointer hover:bg-slate-50/60" : ""}`}
                        key={request.id}
                        onClick={() => onRequestClick?.(request)}
                      >
                        <td className="px-5 py-3.5 font-semibold text-slate-950 font-mono text-[13px] leading-tight">
                          {formatDate(request.leaveDate)}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 font-medium">
                          {leaveSessionLabel(request.type_leave)}
                        </td>
                        <td className="max-w-sm px-5 py-3.5 text-slate-600 leading-normal font-normal">
                          <p className="line-clamp-1 truncate" title={request.reason}>{request.reason || "-"}</p>
                          {request.rejectReason && (
                            <div className="mt-1.5 text-[var(--error-color)] border border-indigo-100/90 rounded-lg p-2 text-xs leading-normal">
                              <span className="font-bold">Từ chối:</span> {request.rejectReason}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide shadow-sm ${request.status === "APPROVED"
                            ? " py-1 text-[var(--success-color)] border-emerald-100/90"
                            : request.status === "REJECTED"
                              ? "border-rose-100/90 py-1 text-[var(--error-color)] "
                              : "border-indigo-100/90 py-1 text-[var(--pending-color)]"
                            }`}>
                            {request.status === "APPROVED" ? (
                              <CheckCircle2 className="w-3.5 h-3.5text-[var(--success-color)]" />
                            ) : request.status === "REJECTED" ? (
                              <XCircle className="w-3.5 h-3.5 text-[var(--error-color)]" />
                            ) : (
                              <HelpCircle className="w-3.5 h-3.5 text-[var(--pending-color)]" />
                            )}
                            <span>{leaveStatusLabel(request.status)}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {request.resolvedBy ? (
                            <div className="space-y-1">
                              <p className="font-semibold text-slate-800">{findStaffName(staffs, request.resolvedBy)}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{formatDateTime(request.resolvedAt)}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal ">Chưa xử lý</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {displayedRequests.length === 0 ? (
                  <p className="px-5 py-6 text-xs text-slate-500 font-medium italic text-center">
                    Không có đơn nào phù hợp với bộ lọc.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}



import { formatDateTime, leaveStatusLabel } from "@/lib/formatters";
import { findStaffName } from "@/lib/leave-app-helpers";
import type { LeaveRequestPaginationMeta } from "@/lib/leave-requests-api";
import type { LeaveRequestRecord, StaffRecord } from "@/types/leave-app";
import { EmptyState } from "./empty-state";
import { RequestTable } from "./request-table";
import { SectionHeader } from "./section-header";

export function ManagerWorkspace({
  manager,
  onRequestsPageChange,
  onViewRequest,
  requests,
  requestsMeta,
  requestsPage,
  staffs,
}: {
  manager: StaffRecord;
  onRequestsPageChange: (nextPage: number) => Promise<void> | void;
  onViewRequest?: (request: LeaveRequestRecord) => void;
  requests: LeaveRequestRecord[];
  requestsMeta?: LeaveRequestPaginationMeta;
  requestsPage: LeaveRequestRecord[];
  staffs: StaffRecord[];
}) {
  const processedByManager = requests
    .filter((request) => request.resolvedBy === manager.id)
    .filter((request) => request.status !== "PENDING");

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,420px)_1fr]">
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <SectionHeader
          title="Manager đã xử lý"
          description={`${manager.fullName} theo dõi kết quả đơn nghỉ phép.`}
        />
        {processedByManager.length === 0 ? (
          <EmptyState
            title="Chưa có đơn đã xử lý"
            description="Các đơn đã duyệt hoặc từ chối bởi bạn sẽ hiển thị tại đây."
          />
        ) : (
          <div className="grid gap-3">
            {processedByManager.map((request) => (
              <div className="rounded-md border border-slate-200 p-3" key={request.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-950">Đơn #{request.id}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Trạng thái: {leaveStatusLabel(request.status)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Xử lý: {formatDateTime(request.resolvedAt)}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      Nhân viên: {findStaffName(staffs, request.staffId)}
                    </p>
                    {request.status === "REJECTED" && request.rejectReason ? (
                      <p className="mt-2 text-sm text-rose-700">
                        Lý do từ chối: {request.rejectReason}
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
                    {leaveStatusLabel(request.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <RequestTable
        calendarRequests={requests}
        onRequestClick={onViewRequest}
        pagination={
          requestsMeta
            ? {
                page: requestsMeta.page,
                pageSize: requestsMeta.limit,
                total: requestsMeta.totalItems,
                onPageChange: onRequestsPageChange,
              }
            : undefined
        }
        requests={requestsPage}
        staffs={staffs}
        title="Tất cả đơn nghỉ phép"
      />
    </div>
  );
}

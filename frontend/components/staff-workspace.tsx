"use client";

import { useRef, useState } from "react";
import type { LeaveRequestPaginationMeta } from "@/lib/leave-requests-api";
import { leaveSessionCreditCost, leaveSessionOptions } from "@/lib/leave-session";
import type { LeaveRequestRecord, LeaveSession, StaffRecord } from "@/types/leave-app";
import { RequestTable } from "./request-table";
import { SectionHeader } from "./section-header";
import { useToast } from "./toast";

export function StaffWorkspace({
  onRequestsPageChange,
  onSubmit,
  onViewRequest,
  requests,
  requestsMeta,
  requestsPage,
  staff,
  staffs,
}: {
  onRequestsPageChange: (nextPage: number) => Promise<void> | void;
  onSubmit: (
    staffId: number,
    leaveDate: string,
    type_leave: LeaveSession,
    reason: string,
  ) => Promise<void>;
  onViewRequest?: (request: LeaveRequestRecord) => void;
  requests: LeaveRequestRecord[];
  requestsMeta?: LeaveRequestPaginationMeta;
  requestsPage: LeaveRequestRecord[];
  staff: StaffRecord;
  staffs: StaffRecord[];
}) {
  const toast = useToast();
  const [leaveDate, setLeaveDate] = useState("");
  const [typeLeave, setTypeLeave] = useState<LeaveSession>("FULL");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const todayDateKey = getTodayDateKey();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmittingRef.current) {
      return;
    }

    if (!leaveDate || !reason.trim()) {
      toast.warning("Cần nhập ngày nghỉ và lý do.");
      return;
    }
    if (leaveDate < todayDateKey) {
      toast.warning("Chỉ được chọn ngày nghỉ từ hôm nay trở đi.");
      return;
    }
    if (staff.leaveCredit < leaveSessionCreditCost(typeLeave)) {
      toast.warning("Nhân viên không đủ ngày phép cho lựa chọn này.");
      return;
    }
    if (hasExistingRequestForDate(requests, staff.id, leaveDate)) {
      toast.warning("Bạn đã có đơn nghỉ phép cho ngày này.");
      return;
    }

    try {
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      await onSubmit(staff.id, leaveDate, typeLeave, reason.trim());
      setLeaveDate("");
      setTypeLeave("FULL");
      setReason("");
      toast.success("Đã gửi đơn cho HEAD duyệt.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gửi đơn thất bại.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
      <section className="rounded-md border border-slate-200 bg-white p-4">
        <SectionHeader
          title="Nhân viên gửi đơn"
          description="Giao diện theo dữ liệu máy chủ."
        />
        <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-950">{staff.fullName}</p>
          <p className="text-slate-600">{staff.email}</p>
          <p className="mt-2 text-slate-700">Ngày phép còn lại: {staff.leaveCredit}</p>
        </div>
        <form className="grid gap-3" onSubmit={handleSubmit}>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Ngày nghỉ
            <input
              className={inputClassName}
              lang="vi-VN"
              min={todayDateKey}
              disabled={isSubmitting}
              onChange={(event) => setLeaveDate(event.target.value)}
              type="date"
              value={leaveDate}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Buổi nghỉ
            <select
              className={inputClassName}
              name="type_leave"
              disabled={isSubmitting}
              onChange={(event) => setTypeLeave(event.target.value as LeaveSession)}
              value={typeLeave}
            >
              {leaveSessionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Lý do
            <textarea
              className={`${inputClassName} min-h-24`}
              disabled={isSubmitting}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Nhập lý do xin nghỉ"
              value={reason}
            />
          </label>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
            ) : null}
            Gửi đơn
          </button>
        </form>
      </section>

      <RequestTable
        calendarRequests={requests}
        minSelectableDate={todayDateKey}
        onDateSelect={setLeaveDate}
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
        title={`Đơn của ${staff.fullName}`}
      />
    </div>
  );
}

function getTodayDateKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

const inputClassName =
  "rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-sky-500";

function hasExistingRequestForDate(
  requests: LeaveRequestRecord[],
  staffId: number,
  leaveDate: string,
) {
  return requests.some(
    (request) =>
      request.staffId === staffId &&
      request.leaveDate === leaveDate,
  );
}

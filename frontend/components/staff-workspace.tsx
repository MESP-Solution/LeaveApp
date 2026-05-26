"use client";

import { useRef, useState } from "react";
import { Send, Calendar, AlertTriangle } from "lucide-react";
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
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      {/* Redesigned Sidebar Container */}
      <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm h-fit lg:sticky lg:top-24">
        <SectionHeader
          title="Yêu cầu nghỉ phép"
          description="Gửi đơn xin nghỉ phép lên cấp trên"
        />

        {/* Premium Profile Widget */}
        <div className="mb-6 rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white font-semibold text-base shadow-sm ring-4 ring-slate-100">
            {staff.fullName.split(" ").pop()?.charAt(0).toUpperCase() || staff.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Nhân viên
            </span>
            <h4 className="font-semibold text-slate-900 leading-tight truncate mt-0.5">
              {staff.fullName}
            </h4>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                {staff.leaveCredit} phép khả dụng
              </span>
            </div>
          </div>
        </div>

        {/* Request Form */}
        <form className="grid gap-4.5" onSubmit={handleSubmit}>
          {/* Leave Date Input */}
          <div className="grid gap-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Ngày nghỉ phép
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                className={`${inputClassName} pl-10`}
                lang="vi-VN"
                min={todayDateKey}
                disabled={isSubmitting}
                onChange={(event) => setLeaveDate(event.target.value)}
                type="date"
                value={leaveDate}
              />
            </div>
            {leaveDate && (
              <span className="text-[11px] font-medium text-slate-500 pl-1 flex items-center gap-1">

                {formatVietnameseDate(leaveDate)}
              </span>
            )}
          </div>

          {/* Segmented Select for Leave Session */}
          <div className="grid gap-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Buổi nghỉ
            </label>
            <div className="grid grid-cols-3 gap-2">
              {leaveSessionOptions.map((option) => {
                const isSelected = typeLeave === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setTypeLeave(option.value)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition-all duration-150 cursor-pointer disabled:cursor-not-allowed active:scale-[0.97]
                      ${isSelected
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm font-medium"
                        : "border-slate-200 bg-slate-50/40 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }
                    `}
                  >
                    <span className="text-xs font-semibold">{option.label}</span>
                    <span
                      className={`text-xs mt-0.5 font-mono ${isSelected ? "text-slate-300" : "text-slate-500 font-medium"
                        }`}
                    >
                      {option.creditCost} ngày
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reason Input */}
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Lý do xin nghỉ
              </label>
              <span className="text-xs font-medium text-slate-400 font-mono">
                {reason.length} / 200 ký tự
              </span>
            </div>
            <textarea
              className={`${inputClassName} min-h-24 resize-none`}
              disabled={isSubmitting}
              maxLength={200}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Vui lòng cung cấp lý do nghỉ cụ thể..."
              value={reason}
            />
          </div>

          {/* Real-time Calculator Widget */}
          {leaveDate && (
            <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-3.5 space-y-2 mt-1 transition-all duration-200 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Mức trừ ngày phép:</span>
                <span className="font-semibold text-slate-900 font-mono">
                  -{leaveSessionCreditCost(typeLeave)} phép
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/50">
                <span className="text-slate-500">Dự kiến khả dụng sau đó:</span>
                <span
                  className={`font-semibold font-mono ${staff.leaveCredit - leaveSessionCreditCost(typeLeave) < 0
                    ? "text-red-600 font-bold"
                    : "text-slate-900"
                    }`}
                >
                  {(staff.leaveCredit - leaveSessionCreditCost(typeLeave)).toFixed(1)} ngày
                </span>
              </div>

              {staff.leaveCredit - leaveSessionCreditCost(typeLeave) < 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-2.5 text-[11px] text-red-700 leading-snug">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Không đủ số dư ngày phép khả dụng để gửi đơn này.</span>
                </div>
              )}
            </div>
          )}

          <button
            className="w-full relative overflow-hidden flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-900 active:scale-[0.98] active:translate-y-[0.5px] transition-all duration-150 disabled:cursor-not-allowed disabled:bg-slate-300 mt-2"
            disabled={isSubmitting || (leaveDate ? staff.leaveCredit - leaveSessionCreditCost(typeLeave) < 0 : false)}
            type="submit"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                <span>Đang gửi đơn...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Gửi đơn xin nghỉ</span>
              </>
            )}
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

function formatVietnameseDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const weekdays = [
      "Chủ Nhật",
      "Thứ Hai",
      "Thứ Ba",
      "Thứ Tư",
      "Thứ Năm",
      "Thứ Sáu",
      "Thứ Bảy",
    ];
    const dayName = weekdays[date.getDay()];
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${dayName}, ngày ${day} tháng ${month} năm ${year}`;
  } catch {
    return "";
  }
}

const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition-all duration-150 placeholder:text-slate-400 focus:border-slate-950 focus:bg-white focus:ring-1 focus:ring-slate-950/10";

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

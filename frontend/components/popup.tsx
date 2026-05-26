"use client";

import { X, Check, AlertCircle, Calendar, Clock, CheckCircle2, XCircle, HelpCircle, Sparkles } from "lucide-react";
import { formatDate, formatDateTime, leaveStatusLabel } from "@/lib/formatters";
import { leaveSessionLabel } from "@/lib/leave-session";
import type { LeaveRequestRecord, StaffRecord } from "@/types/leave-app";

export function LeaveRequestPopup({
  request,
  staffs,
  canProcess,
  isProcessing,
  rejectNote,
  onRejectNoteChange,
  onClose,
  onApprove,
  onReject,
}: {
  request: LeaveRequestRecord;
  staffs: StaffRecord[];
  canProcess: boolean;
  isProcessing: boolean;
  rejectNote: string;
  onRejectNoteChange: (note: string) => void;
  onClose: () => void;
  onApprove: () => void | Promise<void>;
  onReject: () => void | Promise<void>;
}) {
  function findStaffNameById(staffId?: number): string {
    if (!staffId) return "-";
    return staffs.find((staff) => staff.id === staffId)?.fullName ?? "-";
  }

  function findStaffById(staffId?: number): StaffRecord | undefined {
    if (!staffId) return undefined;
    return staffs.find((staff) => staff.id === staffId);
  }

  const requestStaff = findStaffById(request.staffId);
  const staffName = requestStaff?.fullName ?? "-";
  const staffEmail = requestStaff?.email ?? "-";
  const avatarLetter = staffName.split(" ").pop()?.charAt(0).toUpperCase() || staffName.charAt(0).toUpperCase();

  // Dynamic status styles
  const statusTheme = request.status === "APPROVED"
    ? {
      card: "border-emerald-100/90 bg-emerald-50/10",
      avatar: "bg-emerald-50 text-emerald-700 border-emerald-100",
      badge: " py-1 text-[var(--success-color)] border-emerald-100/90 ",
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success-color)]" />
    }
    : request.status === "REJECTED"
      ? {
        card: "border-rose-100/90 bg-rose-50/10",
        avatar: "bg-rose-50 text-rose-700 border-rose-100",
        badge: " border-rose-100/90 py-1 text-[var(--error-color)] ",
        icon: <XCircle className="w-3.5 h-3.5text-[var(--error-color)]" />
      }
      : {
        card: "border-indigo-100/90 bg-indigo-50/10",
        avatar: "bg-indigo-50 text-indigo-700 border-indigo-100",
        badge: "border-indigo-100/90 py-1 text-[var(--pending-color)]",
        icon: <HelpCircle className="w-3.5 h-3.5 text-[var(--pending-color)]" />
      };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 transition-all duration-300 animate-modal-fade"
      role="dialog"
      aria-modal="true"
    >
      {/* Inject custom entry animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalScaleUp {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-fade {
          animation: modalFadeIn 0.2s ease-out forwards;
        }
        .animate-modal-scale {
          animation: modalScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      <div className="absolute inset-0 bg-transparent animate-modal-fade" onClick={onClose} />

      {/* Main Modal Card Container */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl animate-modal-scale max-h-[90vh] overflow-y-auto">

        {/* Header Block */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950 tracking-tight">Chi tiết đơn nghỉ phép</h3>
            <p className="mt-1 text-xs text-slate-500 font-semibold font-mono">Mã số đơn: #{request.id}</p>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all shadow-sm cursor-pointer"
            onClick={onClose}
            type="button"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body Grid */}
        <div className={`mt-5 gap-5 ${canProcess && request.status === "PENDING" ? "grid lg:grid-cols-[1.1fr_0.9fr]" : "flex flex-col"}`}>

          {/* Details Column */}
          <div className="flex flex-col gap-3">
            {/* Profile Block */}
            <div className="flex items-center gap-3 bg-slate-50/50 rounded-xl border border-slate-200/50 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white font-semibold text-base shadow-sm ring-4 ring-slate-100">
                {avatarLetter}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Nhân viên yêu cầu
                </span>
                <h4 className="font-semibold text-slate-900 leading-tight truncate mt-0.5">
                  {staffName}
                </h4>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {staffEmail}
                </p>
              </div>
            </div>

            {/* Structured details */}
            <div className="rounded-xl border border-slate-200/60 bg-white p-4 space-y-3.5 mt-1">
              {/* Date */}
              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100 leading-none">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Ngày nghỉ phép:
                </span>
                <span className="font-semibold text-slate-950 font-mono">
                  {formatVietnameseDate(request.leaveDate) || formatDate(request.leaveDate)}
                </span>
              </div>

              {/* Session */}
              <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100 leading-none">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Buổi nghỉ:
                </span>
                <span className="font-semibold text-slate-950">
                  {leaveSessionLabel(request.type_leave)}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between text-xs leading-none">
                <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-4 h-4 text-slate-400" />
                  Trạng thái:
                </span>
                <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap shadow-sm ${statusTheme.badge}`}>
                  {statusTheme.icon}
                  <span>{leaveStatusLabel(request.status)}</span>
                </span>
              </div>
            </div>

            {/* Reason block */}
            {request.reason && (
              <div className="rounded-xl border border-indigo-100/90 bg-slate-50/30 p-3.5 flex flex-col gap-1.5 mt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                  Lý do xin nghỉ
                </span>
                <div className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-wrap pl-1 italic">
                  &ldquo;{request.reason}&rdquo;
                </div>
              </div>
            )}

            {/* Action History Trail */}
            {(request.resolvedBy || request.resolvedAt) && (
              <div className="rounded-xl border border-slate-200/60 bg-slate-50/20 p-4 grid gap-3 mt-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/50 pb-2 leading-none flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                  Lịch sử xử lý đơn
                </p>
                <div className="flex justify-between items-center text-xs text-slate-600 leading-none">
                  <span className="font-medium">Xử lý bởi:</span>
                  <span className="font-semibold text-slate-900">{findStaffNameById(request.resolvedBy)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-600 leading-none">
                  <span className="font-medium">Thời gian:</span>
                  <span className="font-semibold text-slate-900">{formatDateTime(request.resolvedAt)}</span>
                </div>
                {request.rejectReason && (
                  <div className="mt-1 pt-2 border-t border-slate-200/50 flex flex-col gap-1.5 text-slate-655">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Phản hồi từ chối:</span>
                    <div className=" text-[var(--error-color)] border-indigo-100/90 rounded-lg p-2.5 text-xs leading-relaxed font-normal whitespace-pre-wrap">
                      {request.rejectReason}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Approval Column */}

          {canProcess && request.status === "PENDING" && (
            <div className="rounded-xl border border-slate-200/60 bg-slate-50/40 p-4 shadow-sm flex flex-col h-fit">
              <div className="flex items-center gap-1.5 mb-3 border-b border-slate-200/50 pb-2.5">
                <AlertCircle className="w-4 h-4 text-slate-500" />
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider leading-none">Phê duyệt đơn xin</p>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-[11px] text-slate-500 leading-none">
                  <span>Phản hồi khi xử lý đơn:</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {rejectNote.length} / 200 ký tự
                  </span>
                </div>
                <textarea
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-950 focus:ring-1 focus:ring-slate-950/10 min-h-[110px] resize-none"
                  onChange={(event) => {
                    if (event.target.value.length <= 200) {
                      onRejectNoteChange(event.target.value);
                    }
                  }}
                  maxLength={200}
                  placeholder="Nhập phản hồi từ chối hoặc lời nhắn duyệt phép..."
                  rows={4}
                  value={rejectNote}
                  disabled={isProcessing}
                />

                <div className="mt-1 flex items-center gap-2">
                  <button
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-xs font-medium shadow-sm active:scale-[0.98] active:translate-y-[0.5px] transition-all disabled:bg-slate-350 disabled:cursor-not-allowed cursor-pointer"
                    disabled={isProcessing || request.status !== "PENDING"}
                    onClick={onApprove}
                    type="button"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Duyệt</span>
                  </button>
                  <button
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-rose-250 text-rose-600 hover:bg-rose-50/50 px-3 py-2 text-xs font-medium shadow-sm active:scale-[0.98] active:translate-y-[0.5px] transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                    disabled={isProcessing || request.status !== "PENDING" || !rejectNote.trim()}
                    onClick={onReject}
                    type="button"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Từ chối</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
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

"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle2, XCircle, HelpCircle, Sparkles } from "lucide-react";
import { formatDate, formatMonth, leaveStatusLabel } from "@/lib/formatters";
import { findStaffName } from "@/lib/leave-app-helpers";
import { leaveSessionLabel } from "@/lib/leave-session";
import type { LeaveRequestRecord, StaffRecord } from "@/types/leave-app";
import { EmptyState } from "./empty-state";
import { SectionHeader } from "./section-header";

const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const statusDotClasses: Record<LeaveRequestRecord["status"], string> = {
  APPROVED: "bg-emerald-500",
  PENDING: "bg-blue-500",
  REJECTED: "bg-rose-500",
};



export function LeaveCalendar({
  requests,
  staffs,
  controls,
  minSelectableDate,
  onDateSelect,
  onRequestClick,
}: {
  minSelectableDate?: string;
  requests: LeaveRequestRecord[];
  staffs: StaffRecord[];
  controls?: ReactNode;
  onDateSelect?: (dateKey: string) => void;
  onRequestClick?: (request: LeaveRequestRecord) => void;
}) {
  const firstRequestDate = requests[0]?.leaveDate ?? new Date().toISOString();
  const initialMonth = toMonthStart(firstRequestDate);
  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const [selectedDate, setSelectedDate] = useState(firstRequestDate.slice(0, 10));

  const todayDateKey = useMemo(() => getTodayDateKey(), []);

  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const requestsByDate = useMemo(() => groupRequestsByDate(requests), [requests]);
  const selectedRequests = requestsByDate.get(selectedDate) ?? [];

  if (requests.length === 0) {
    return (
      <EmptyState
        title="Chưa có lịch nghỉ"
        description="Khi có đơn, lịch theo ngày sẽ hiển thị ở đây."
      />
    );
  }

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm mt-2">
      {/* Calendar Header with Controls */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <SectionHeader
          title="Lịch nghỉ theo ngày"
          description="Chọn từng ngày để xem đơn nghỉ và trạng thái xử lý"
        />

        <div className="flex flex-wrap items-center justify-end gap-3">
          {controls}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-250/20">
            <button
              className={navButtonClassName}
              onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
              type="button"
              aria-label="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <p className="min-w-28 text-center text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
              {formatMonth(visibleMonth)}
            </p>
            <button
              className={navButtonClassName}
              onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
              type="button"
              aria-label="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekdays Row */}
      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 bg-slate-50/50 py-2.5 rounded-xl border border-slate-100/50">
        {weekDays.map((day) => (
          <div key={day}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Month Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {calendarDays.map((day) => {
          const dayRequests = requestsByDate.get(day.dateKey) ?? [];
          const isSelected = selectedDate === day.dateKey;
          const isPastSelectableDate = Boolean(minSelectableDate && day.dateKey < minSelectableDate);
          const isToday = day.dateKey === todayDateKey;

          return (
            <button
              className={[
                "min-h-[88px] rounded-xl border p-3 text-left text-xs transition-all duration-150 flex flex-col justify-between relative active:scale-[0.98]",
                day.inMonth ? "bg-white text-slate-900" : "bg-slate-50/50 text-slate-400",
                isSelected
                  ? "border-slate-900 bg-slate-50/[0.01] ring-1 ring-slate-900/5 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] font-bold"
                  : "border-slate-200/70",
                isPastSelectableDate ? "cursor-not-allowed opacity-45" : "hover:bg-slate-50/70 hover:border-slate-350",
              ].join(" ")}
              key={day.dateKey}
              onClick={() => {
                setSelectedDate(day.dateKey);
                if (!isPastSelectableDate) {
                  onDateSelect?.(day.dateKey);
                }
              }}
              title={isPastSelectableDate ? "Chỉ được chọn ngày nghỉ từ hôm nay trở đi" : undefined}
              type="button"
            >
              <div className="flex items-center justify-between w-full">
                {isToday ? (
                  <span className="h-5 w-5 rounded-full bg-slate-900 text-white font-semibold font-mono text-[10px] flex items-center justify-center shadow-sm" title="Hôm nay">
                    {day.dayNumber}
                  </span>
                ) : (
                  <span className={`font-semibold font-mono ${isSelected ? "text-slate-900" : ""}`}>{day.dayNumber}</span>
                )}
                {dayRequests.length > 0 && (
                  <span className="text-[10px] font-semibold text-slate-400 font-mono ">

                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-1 w-full">
                {dayRequests.slice(0, 3).map((request) => (
                  <span
                    className={`h-1.5 w-1.5 rounded-full border border-white ring-1 ring-slate-100 ${statusDotClasses[request.status]}`}
                    key={request.id}
                    title={leaveStatusLabel(request.status)}
                  />
                ))}
                {dayRequests.length > 3 ? (
                  <span className="text-[9px] font-bold text-slate-400 leading-none self-center">
                    +{dayRequests.length - 3}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day Details Panel */}
      <div className="mt-6 rounded-xl border border-slate-200/60 bg-slate-50/40 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-200/50 pb-3">
          <Calendar className="w-4 h-4 text-slate-500" />
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Chi tiết ngày: {formatVietnameseDate(selectedDate) || formatDate(selectedDate)}
          </p>
        </div>
        {selectedRequests.length === 0 ? (
          <div className=" flex flex-col items-center justify-center py-6 text-center">
            <Sparkles className="w-5 h-5 text-slate-350 mb-2" />
            <p className="text-xs text-slate-500 font-normal leading-relaxed">
              Không có đơn nghỉ phép trong ngày này
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {selectedRequests.map((request) => {
              const staffName = findStaffName(staffs, request.staffId);

              const statusTheme = request.status === "APPROVED"
                ? {
                  card: "border-slate-200/60 bg-emerald-50/10 hover:border-emerald-250",
                  badge: " py-1 text-[var(--success-color)] border-emerald-100/90 ",
                  icon: <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success-color)]" />
                }
                : request.status === "REJECTED"
                  ? {
                    card: "border-slate-200/60 bg-rose-50/10 hover:border-rose-250",

                    badge: " border-rose-100/90 py-1 text-[var(--error-color)] ",
                    icon: <XCircle className="w-3.5 h-3.5 text-[var(--errorror-color" />
                  }
                  : {
                    card: "border-slate-200/60 bg-indigo-50/10 hover:border-indigo-250",
                    badge: "border-indigo-100/90 py-1 text-[var(--pending-color)] ",
                    icon: <HelpCircle className="w-3.5 h-3.5 text-[var(--pending-color)]" />
                  };

              return (
                <button
                  className={`cursor-pointer w-full rounded-xl border p-4 text-left shadow-sm active:scale-[0.99] active:translate-y-[0.5px] transition-all duration-150 flex flex-col gap-2.5 bg-white ${statusTheme.card}`}
                  key={request.id}
                  onClick={() => onRequestClick?.(request)}
                  type="button"
                >
                  <div className="flex items-center justify-between w-full gap-3   ">
                    <div className="flex items-center gap-2.5 min-w-0 ">
                      <div className="min-w-0 ">
                        <p className="font-semibold text-slate-900 leading-tight truncate">
                          {staffName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5 leading-none">
                          ID: #{request.id}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap shadow-sm ${statusTheme.badge}`}>
                      {statusTheme.icon}
                      <span>{leaveStatusLabel(request.status)}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 leading-none pl-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">{leaveSessionLabel(request.type_leave)}</span>
                  </div>

                  {request.reason && (
                    <div className="text-xs text-slate-600 bg-slate-50/70 p-3 rounded-lg border border-slate-100 leading-relaxed font-normal w-full whitespace-pre-wrap">
                      {request.reason}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function buildCalendarDays(monthDate: Date) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const mondayOffset = (monthStart.getDay() + 6) % 7;
  const firstCell = new Date(monthStart);
  firstCell.setDate(monthStart.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell);
    date.setDate(firstCell.getDate() + index);

    return {
      dateKey: toDateKey(date),
      dayNumber: date.getDate(),
      inMonth: date >= monthStart && date <= monthEnd,
    };
  });
}

function groupRequestsByDate(requests: LeaveRequestRecord[]) {
  const grouped = new Map<string, LeaveRequestRecord[]>();

  for (const request of requests) {
    const items = grouped.get(request.leaveDate) ?? [];
    grouped.set(request.leaveDate, [...items, request]);
  }

  return grouped;
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function toMonthStart(value: string) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
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

const navButtonClassName =
  "flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.96] transition-all duration-150 shadow-sm border border-slate-200/50";

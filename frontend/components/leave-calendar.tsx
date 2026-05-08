"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { formatDate, formatMonth, leaveStatusLabel } from "@/lib/formatters";
import { findStaffName } from "@/lib/leave-app-helpers";
import { leaveSessionLabel } from "@/lib/leave-session";
import type { LeaveRequestRecord, StaffRecord } from "@/types/leave-app";
import { EmptyState } from "./empty-state";

const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const statusDotClasses: Record<LeaveRequestRecord["status"], string> = {
  APPROVED: "bg-emerald-500",
  PENDING: "bg-sky-500",
  REJECTED: "bg-rose-500",
};

const statusBadgeClasses: Record<LeaveRequestRecord["status"], string> = {
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PENDING: "border-sky-200 bg-sky-50 text-sky-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
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
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Lịch nghỉ theo ngày</h2>
          <p className="mt-1 text-sm text-slate-600">
            Chọn từng ngày để xem đơn nghỉ và trạng thái xử lý.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {controls}
          <button
            className={navButtonClassName}
            onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
            type="button"
          >
            Trước
          </button>
          <p className="min-w-32 text-center text-sm font-medium text-slate-950">
            {formatMonth(visibleMonth)}
          </p>
          <button
            className={navButtonClassName}
            onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
            type="button"
          >
            Sau
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
        {weekDays.map((day) => (
          <div className="py-2" key={day}>
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const dayRequests = requestsByDate.get(day.dateKey) ?? [];
          const isSelected = selectedDate === day.dateKey;
          const isPastSelectableDate = Boolean(minSelectableDate && day.dateKey < minSelectableDate);

          return (
            <button
              className={[
                "min-h-20 rounded-md border p-2 text-left text-xs transition-colors",
                day.inMonth ? "bg-white text-slate-950" : "bg-slate-50 text-slate-400",
                isSelected ? "border-sky-400 ring-2 ring-sky-100" : "border-slate-200",
                isPastSelectableDate ? "cursor-not-allowed opacity-60" : "hover:bg-slate-50",
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
              <span className="font-medium">{day.dayNumber}</span>
              <div className="mt-2 flex flex-wrap gap-1">
                {dayRequests.slice(0, 3).map((request) => (
                  <span
                    className={`h-2 w-2 rounded-full ${statusDotClasses[request.status]}`}
                    key={request.id}
                    title={leaveStatusLabel(request.status)}
                  />
                ))}
              </div>
              {dayRequests.length > 3 ? (
                <p className="mt-1 text-[11px] text-slate-500">+{dayRequests.length - 3}</p>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-medium text-slate-950">{formatDate(selectedDate)}</p>
        {selectedRequests.length === 0 ? (
          <p className="mt-1 text-sm text-slate-600">Không có đơn nghỉ trong ngày này.</p>
        ) : (
          <div className="mt-3 grid gap-2">
            {selectedRequests.map((request) => (
              <button
                className="w-full rounded-md bg-white p-3 text-left text-sm hover:bg-slate-50"
                key={request.id}
                onClick={() => onRequestClick?.(request)}
                type="button"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-950">{findStaffName(staffs, request.staffId)}</p>
                  <span
                    className={`rounded-md border px-2 py-1 text-xs font-medium ${statusBadgeClasses[request.status]}`}
                  >
                    {leaveStatusLabel(request.status)}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {leaveSessionLabel(request.type_leave)}
                </p>
                <p className="mt-1 text-slate-600">{request.reason}</p>
              </button>
            ))}
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

const navButtonClassName =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";

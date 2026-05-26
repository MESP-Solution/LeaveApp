"use client";

import { useMemo, useState } from "react";
import {
  Users, FileText, CheckCircle, Clock, XCircle, Sun, CalendarDays,
} from "lucide-react";
import type { LeaveRequestRecord, StaffRecord } from "@/types/leave-app";

const SESSION_LABEL: Record<string, string> = {
  MORNING:   "Buổi sáng",
  AFTERNOON: "Buổi chiều",
  FULL:      "Cả ngày",
};

const SESSION_DAYS: Record<string, number> = {
  MORNING: 0.5,
  AFTERNOON: 0.5,
  FULL: 1,
};

const MONTH_SHORT = ["T.1","T.2","T.3","T.4","T.5","T.6","T.7","T.8","T.9","T.10","T.11","T.12"];

export function DashboardTab({
  requests,
  staffs,
}: {
  requests: LeaveRequestRecord[];
  staffs: StaffRecord[];
}) {
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const stats = useMemo(() => {
    const pending      = requests.filter((r) => r.status === "PENDING").length;
    const approved     = requests.filter((r) => r.status === "APPROVED").length;
    const rejected     = requests.filter((r) => r.status === "REJECTED").length;
    const totalLeaveDays = requests
      .filter((r) => r.status === "APPROVED")
      .reduce((sum, r) => sum + (SESSION_DAYS[r.type_leave] ?? 1), 0);
    const bySession = requests.reduce<Record<string, number>>((acc, r) => {
      const key = r.type_leave ?? "FULL";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const recent = [...requests]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
    return { pending, approved, rejected, totalLeaveDays, bySession, recent };
  }, [requests]);

  // Count requests per month for the dot indicators
  const monthCounts = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        requests.filter((r) => new Date(r.leaveDate).getMonth() === i).length,
      ),
    [requests],
  );

  // Requests in the selected month
  const monthlyRequests = useMemo(
    () =>
      requests
        .filter((r) => new Date(r.leaveDate).getMonth() + 1 === selectedMonth)
        .sort((a, b) => new Date(a.leaveDate).getTime() - new Date(b.leaveDate).getTime()),
    [requests, selectedMonth],
  );

  const total        = requests.length;
  const approvalRate = total > 0 ? Math.round((stats.approved / total) * 100) : 0;
  const sessionEntries = Object.entries(stats.bySession).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">

      {/* Summary strip */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="grid grid-cols-3 divide-x divide-slate-100 sm:grid-cols-6">
          {([
            { label: "Nhân sự",   value: staffs.length,        icon: Users,        accent: "oklch(50% 0.18 264)" },
            { label: "Tổng đơn",  value: total,                icon: FileText,     accent: "oklch(50% 0.15 220)" },
            { label: "Chờ duyệt", value: stats.pending,        icon: Clock,        accent: "oklch(62% 0.19 72)",  warn: stats.pending > 0 },
            { label: "Đã duyệt",  value: stats.approved,       icon: CheckCircle,  accent: "oklch(54% 0.17 152)" },
            { label: "Từ chối",   value: stats.rejected,       icon: XCircle,      accent: "oklch(57% 0.21 25)"  },
            { label: "Ngày nghỉ", value: stats.totalLeaveDays, icon: CalendarDays, accent: "oklch(52% 0.17 300)" },
          ] as const).map(({ label, value, icon: Icon, accent, warn }) => (
            <div key={label} className="flex flex-col gap-1.5 px-5 py-4">
              <Icon className="h-4 w-4 shrink-0" style={{ color: warn ? "oklch(62% 0.19 72)" : accent }} />
              <span
                className="text-xl font-bold tabular-nums leading-none"
                style={{ color: warn ? "oklch(42% 0.19 72)" : "oklch(14% 0.006 264)" }}
              >
                {value}
              </span>
              <span className="text-[11px] leading-none" style={{ color: "oklch(60% 0.006 264)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">

        {/* Request pipeline — left */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:col-span-3">
          <div className="border-b border-slate-100 px-6 py-4">
            <p className="text-sm font-bold" style={{ color: "oklch(14% 0.006 264)" }}>Luồng xử lý đơn</p>
            <p className="mt-0.5 text-xs" style={{ color: "oklch(58% 0.006 264)" }}>Tỉ lệ duyệt và phân bổ trạng thái</p>
          </div>
          <div className="space-y-5 px-6 py-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: "oklch(28% 0.006 264)" }}>Tỉ lệ duyệt</span>
                <span className="text-xs font-bold tabular-nums" style={{ color: "oklch(54% 0.17 152)" }}>{approvalRate}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "oklch(93% 0.005 264)" }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${approvalRate}%`, background: "oklch(54% 0.17 152)" }} />
              </div>
            </div>

            <div className="space-y-1">
              {([
                { label: "Chờ duyệt", count: stats.pending,  color: "oklch(62% 0.19 72)",  bg: "oklch(97% 0.015 72)"  },
                { label: "Đã duyệt",  count: stats.approved, color: "oklch(54% 0.17 152)", bg: "oklch(97% 0.015 152)" },
                { label: "Từ chối",   count: stats.rejected, color: "oklch(57% 0.21 25)",  bg: "oklch(97% 0.015 25)"  },
              ] as const).map(({ label, count, color, bg }) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={label} className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: bg }}>
                    <div className="flex items-center gap-2.5">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                      <span className="text-sm font-medium" style={{ color: "oklch(22% 0.006 264)" }}>{label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold tabular-nums" style={{ color }}>{count}</span>
                      <span className="w-9 text-right text-[11px] tabular-nums" style={{ color: "oklch(60% 0.006 264)" }}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {sessionEntries.length > 0 && (
              <div className="space-y-2.5 border-t border-slate-100 pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "oklch(60% 0.006 264)" }}>Loại buổi</p>
                {sessionEntries.map(([session, count]) => {
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={session} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-xs font-medium" style={{ color: "oklch(28% 0.006 264)" }}>{SESSION_LABEL[session] ?? session}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "oklch(93% 0.005 264)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "oklch(56% 0.16 264)" }} />
                      </div>
                      <span className="w-8 text-right text-xs tabular-nums" style={{ color: "oklch(60% 0.006 264)" }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Monthly stats — right */}
        <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:col-span-2">
          {/* Panel header */}
          <div className="border-b border-slate-100 px-5 py-4 ">
            <p className="text-sm font-bold" style={{ color: "oklch(14% 0.006 264)" }}>Thống kê theo tháng</p>
            <p className="mt-0.5 text-xs" style={{ color: "oklch(58% 0.006 264)" }}>
              Nhân sự nghỉ trong tháng {selectedMonth} / {new Date().getFullYear()}
            </p>
          </div>

          {/* 12 month tabs — 4×3 grid */}
          <div className="grid grid-cols-6 gap-1 border-b border-slate-100 p-3">
            {MONTH_SHORT.map((label, i) => {
              const month   = i + 1;
              const count   = monthCounts[i] ?? 0;
              const active  = month === selectedMonth;
              const hasDot  = count > 0 && !active;
              return (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  type="button"
                  className="relative flex flex-col items-center justify-center rounded-lg py-1.5 text-[11px] font-medium transition-all duration-150 active:scale-95"
                  style={{
                    background: active ? "oklch(56% 0.16 264)" : "transparent",
                    color: active
                      ? "oklch(99% 0.004 264)"
                      : count > 0
                        ? "oklch(22% 0.006 264)"
                        : "oklch(72% 0.006 264)",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = "oklch(95% 0.012 264)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {label}
                  {hasDot && (
                    <span
                      className="mt-0.5 h-1 w-1 rounded-full"
                      style={{ background: "oklch(62% 0.16 264)" }}
                    />
                  )}
                  {active && count > 0 && (
                    <span
                      className="mt-0.5 text-[9px] font-bold tabular-nums leading-none"
                      style={{ color: "oklch(90% 0.04 264)" }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Requests for selected month */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {monthlyRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <CalendarDays className="mb-2 h-7 w-7" style={{ color: "oklch(82% 0.01 264)" }} />
                <p className="text-xs font-medium" style={{ color: "oklch(60% 0.006 264)" }}>
                  Không có đơn nào trong tháng {selectedMonth}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100/80 h-[200px]">
                {monthlyRequests.map((req) => {
                  const staff = staffs.find((s) => s.id === req.staffId);
                  const initials = staff?.fullName
                    ? staff.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                    : "??";
                  const statusColor =
                    req.status === "APPROVED" ? "oklch(54% 0.17 152)"
                    : req.status === "REJECTED" ? "oklch(57% 0.21 25)"
                    : "oklch(62% 0.19 72)";
                  const statusBg =
                    req.status === "APPROVED" ? "oklch(97% 0.015 152)"
                    : req.status === "REJECTED" ? "oklch(97% 0.015 25)"
                    : "oklch(97% 0.015 72)";
                  const statusLabel =
                    req.status === "APPROVED" ? "Duyệt"
                    : req.status === "REJECTED" ? "Từ chối"
                    : "Chờ";

                  return (
                    <div key={req.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                        style={{ background: "oklch(94% 0.02 264)", color: "oklch(46% 0.16 264)" }}
                      >
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold leading-snug" style={{ color: "oklch(14% 0.006 264)" }}>
                          {staff?.fullName ?? "Nhân viên"}
                        </p>
                        <p className="text-[11px]" style={{ color: "oklch(60% 0.006 264)" }}>
                          {new Date(req.leaveDate).toLocaleDateString("vi-VN")}
                          {" · "}
                          {SESSION_LABEL[req.type_leave] ?? req.type_leave}
                        </p>
                      </div>
                      <span
                        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                        style={{ background: statusBg, color: statusColor }}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer count */}
          {monthlyRequests.length > 0 && (
            <div
              className="border-t border-slate-100 px-5 py-2.5 text-[11px]"
              style={{ color: "oklch(58% 0.006 264)" }}
            >
              {monthlyRequests.length} đơn trong tháng {selectedMonth}
            </div>
          )}
        </div>
      </div>

      {/* Recent requests feed */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <p className="text-sm font-bold" style={{ color: "oklch(14% 0.006 264)" }}>Hoạt động gần đây</p>
          <p className="mt-0.5 text-xs" style={{ color: "oklch(58% 0.006 264)" }}>6 đơn mới nhất</p>
        </div>
        {stats.recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14">
            <FileText className="mb-3 h-8 w-8" style={{ color: "oklch(80% 0.01 264)" }} />
            <p className="text-sm font-medium" style={{ color: "oklch(50% 0.006 264)" }}>Chưa có đơn nào</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100/80">
            {stats.recent.map((req) => {
              const staff = staffs.find((s) => s.id === req.staffId);
              const initials = staff?.fullName
                ? staff.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                : "??";
              const statusColor =
                req.status === "APPROVED" ? "oklch(54% 0.17 152)"
                : req.status === "REJECTED" ? "oklch(57% 0.21 25)"
                : "oklch(62% 0.19 72)";
              const statusBg =
                req.status === "APPROVED" ? "oklch(97% 0.015 152)"
                : req.status === "REJECTED" ? "oklch(97% 0.015 25)"
                : "oklch(97% 0.015 72)";
              const statusLabel =
                req.status === "APPROVED" ? "Đã duyệt"
                : req.status === "REJECTED" ? "Từ chối"
                : "Chờ duyệt";
              return (
                <div key={req.id} className="flex items-center gap-4 px-6 py-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{ background: "oklch(94% 0.02 264)", color: "oklch(46% 0.16 264)" }}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-snug" style={{ color: "oklch(14% 0.006 264)" }}>
                      {staff?.fullName ?? "Nhân viên"}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: "oklch(58% 0.006 264)" }}>
                      {SESSION_LABEL[req.type_leave] ?? req.type_leave}
                      {" · "}
                      {new Date(req.leaveDate).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold"
                    style={{ background: statusBg, color: statusColor }}
                  >
                    {statusLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
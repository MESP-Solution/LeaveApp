"use client";

import { useState } from "react";
import { useAdminTab } from "@/lib/admin-tab-context";
import { findRoleName } from "@/lib/leave-app-helpers";
import type { LeaveRequestPaginationMeta } from "@/lib/leave-requests-api";
import { fetchStaffById } from "@/lib/staff-api";
import type { LeaveRequestRecord, RoleRecord, StaffRecord } from "@/types/leave-app";
import { RequestTable } from "./request-table";
import { useToast } from "./toast";
import { Search, UserPlus, Trash2, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { AdminCreateStaffModal } from "./admin-create-staff-modal";
import { AdminStaffDetailModal } from "./admin-staff-detail-modal";
import { DashboardTab } from "./dashboard-tab";

const roleLabelByName: Record<string, string> = {
  ADMIN: "Admin",
  HEAD: "Trưởng phòng",
  MANAGER: "Quản lý",
  STAFF: "Nhân viên",
};

const roleConfig: Record<string, { badge: string; avatar: string }> = {
  ADMIN: {
    badge: "bg-indigo-950 text-indigo-50",
    avatar: "bg-indigo-950 text-indigo-50",
  },
  HEAD: {
    badge: "bg-amber-100 text-amber-900",
    avatar: "bg-amber-100 text-amber-900",
  },
  MANAGER: {
    badge: "bg-violet-100 text-violet-900",
    avatar: "bg-violet-100 text-violet-900",
  },
  STAFF: {
    badge: "bg-slate-100 text-slate-600",
    avatar: "bg-slate-100 text-slate-600",
  },
};

export function AdminWorkspace({
  currentRole,
  onCreateStaff,
  onDeleteStaff,
  onPageChange,
  onRequestsPageChange,
  onViewRequest,
  roles,
  requests,
  requestsMeta,
  requestsPage,
  staffs,
  staffsPage,
  staffMeta,
}: {
  currentRole: "ADMIN" | "HEAD" | "MANAGER";
  onCreateStaff: (input: {
    fullName: string;
    email: string;
    password: string;
    smtpPass: string;
    roleId?: number;
    leaveCredit?: number;
  }) => Promise<void>;
  onDeleteStaff: (staffId: number) => Promise<void>;
  onPageChange: (nextPage: number) => Promise<void> | void;
  onRequestsPageChange: (nextPage: number) => Promise<void> | void;
  onViewRequest?: (request: LeaveRequestRecord) => void;
  roles: RoleRecord[];
  requests: LeaveRequestRecord[];
  requestsMeta?: LeaveRequestPaginationMeta;
  requestsPage: LeaveRequestRecord[];
  staffs: StaffRecord[];
  staffsPage: StaffRecord[];
  staffMeta?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}) {
  const canDeleteStaff = currentRole === "ADMIN";
  const toast = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffRecord>();
  const [isStaffDetailOpen, setIsStaffDetailOpen] = useState(false);
  const [isLoadingStaffDetail, setIsLoadingStaffDetail] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const { activeTab } = useAdminTab();

  async function handleDeleteStaff(staffId: number) {
    try {
      await onDeleteStaff(staffId);
      toast.success("Xóa nhân viên thành công.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xóa nhân viên thất bại.");
    }
  }

  async function handleOpenStaffDetail(staffId: number) {
    setIsStaffDetailOpen(true);
    setIsLoadingStaffDetail(true);
    try {
      const detail = await fetchStaffById(staffId);
      setSelectedStaff(detail);
    } catch (error) {
      setSelectedStaff(undefined);
      toast.error(error instanceof Error ? error.message : "Không tải được thông tin nhân sự.");
    } finally {
      setIsLoadingStaffDetail(false);
    }
  }

  return (
    <div className="grid gap-4">
    {activeTab === "dashboard" ? (
  <DashboardTab requests={requests} staffs={staffs} />
) : activeTab === "hr" ? (
        (() => {
          const trimmedSearch = staffSearch.trim().toLowerCase();
          const isSearching = trimmedSearch.length > 0;
          const filteredStaffs = isSearching
            ? staffs.filter(
                (staff) =>
                  staff.fullName.toLowerCase().includes(trimmedSearch) ||
                  staff.email.toLowerCase().includes(trimmedSearch),
              )
            : [];
          const displayedStaffs = isSearching ? filteredStaffs : staffsPage;
          const totalCount = isSearching
            ? filteredStaffs.length
            : (staffMeta?.totalItems ?? null);

          return (
            <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              {/* Panel header */}
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "oklch(96% 0.018 264)" }}
                    >
                      <Users className="h-4 w-4" style={{ color: "oklch(50% 0.18 264)" }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2
                          className="text-sm font-bold leading-none"
                          style={{ color: "oklch(14% 0.008 264)" }}
                        >
                          Quản trị nhân sự
                        </h2>
                        {totalCount !== null && (
                          <span
                            className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                            style={{
                              background: "oklch(94% 0.025 264)",
                              color: "oklch(46% 0.18 264)",
                            }}
                          >
                            {totalCount}
                          </span>
                        )}
                      </div>
                      <p
                        className="mt-1 text-xs leading-none"
                        style={{ color: "oklch(58% 0.008 264)" }}
                      >
                        Quản lý tài khoản và vai trò từ máy chủ
                      </p>
                    </div>
                  </div>

                  <button
                    className="shrink-0 inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-200 active:scale-95 bg-[var(--foreground)] hover:opacity-80 hover:shadow-md"
                    onClick={() => setIsCreateModalOpen(true)}
                
                   
                    type="button"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Thêm nhân sự
                  </button>
                </div>

                {/* Search */}
                <div className="relative mt-4">
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5"
                    style={{ color: "oklch(65% 0.008 264)" }}
                  >
                    <Search className="h-3.5 w-3.5" />
                  </div>
                  <input
                    className="w-full rounded-xl border py-2.5 pl-9 pr-4 text-sm outline-none transition-all duration-150"
                    onChange={(e) => setStaffSearch(e.target.value)}
                    placeholder="Tìm theo họ tên hoặc địa chỉ email..."
                    type="search"
                    value={staffSearch}
                    style={{
                      borderColor: "oklch(88% 0.01 264)",
                      background: "oklch(98% 0.004 264)",
                      color: "oklch(14% 0.008 264)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "oklch(70% 0.14 264)";
                      e.currentTarget.style.background = "oklch(100% 0 0)";
                      e.currentTarget.style.boxShadow = "0 0 0 3px oklch(94% 0.04 264)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "oklch(88% 0.01 264)";
                      e.currentTarget.style.background = "oklch(98% 0.004 264)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>
              </div>

              {/* Staff rows */}
              {displayedStaffs.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div
                    className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ background: "oklch(96% 0.006 264)" }}
                  >
                    <Search className="h-5 w-5" style={{ color: "oklch(68% 0.01 264)" }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "oklch(14% 0.008 264)" }}>
                    {isSearching ? "Không tìm thấy kết quả" : "Chưa có nhân sự nào"}
                  </p>
                  <p
                    className="mt-1.5 max-w-xs text-xs"
                    style={{ color: "oklch(58% 0.008 264)" }}
                  >
                    {isSearching
                      ? "Không có nhân sự nào khớp với từ khóa bạn nhập."
                      : "Thêm nhân sự đầu tiên để bắt đầu quản lý hệ thống."}
                  </p>
                </div>
           ) : (
                <div className="min-h-0 flex-1 divide-y divide-slate-100/80 overflow-y-auto">
                  {displayedStaffs.map((staff) => {
                    const initials = staff.fullName
                      ? staff.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : "US";
                    const roleName = findRoleName(staff);
                    const config = roleConfig[roleName] ?? roleConfig.STAFF;

                    return (
                      <div
                        key={staff.id}
                        className="group flex items-center gap-4 px-6 py-3.5 transition-colors duration-100 hover:bg-slate-50/70"
                      >
                        <button
                          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3.5 text-left focus:outline-none"
                          onClick={() => void handleOpenStaffDetail(staff.id)}
                          type="button"
                        >
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${config.avatar}`}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="truncate text-sm font-semibold leading-snug transition-colors duration-100 group-hover:underline"
                              style={{ color: "oklch(14% 0.008 264)" }}
                            >
                              {staff.fullName}
                            </p>
                            <p
                              className="mt-0.5 truncate text-xs"
                              style={{ color: "oklch(58% 0.008 264)" }}
                            >
                              {staff.email}
                            </p>
                          </div>
                        </button>

                        <div className="flex shrink-0 items-center gap-3">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${config.badge}`}
                          >
                            {roleLabelByName[roleName] || roleName}
                          </span>
                          <span
                            className="hidden whitespace-nowrap text-[11px] sm:block"
                            style={{ color: "oklch(65% 0.008 264)" }}
                          >
                            <span
                              className="font-bold"
                              style={{ color: "oklch(28% 0.008 264)" }}
                            >
                              {staff.leaveCredit}
                            </span>{" "}
                            ngày phép
                          </span>
                          {canDeleteStaff && (
                            <button
                              className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 opacity-0 transition-all duration-150 hover:bg-rose-50 hover:text-rose-500 active:scale-95 focus:opacity-100 focus:outline-none group-hover:opacity-100"
                              onClick={() => void handleDeleteStaff(staff.id)}
                              title="Xóa tài khoản nhân sự"
                              type="button"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
            )}
              {!isSearching && staffMeta && staffMeta.totalPages > 1 && (
                <div
                  className="flex items-center justify-between border-t px-6 py-3.5"
                  style={{
                    borderColor: "oklch(93% 0.005 264)",
                    background: "oklch(98.5% 0.004 264)",
                  }}
                >
                  <p className="text-xs" style={{ color: "oklch(58% 0.008 264)" }}>
                    Trang{" "}
                    <span className="font-semibold" style={{ color: "oklch(20% 0.008 264)" }}>
                      {staffMeta.page}
                    </span>{" "}
                    / {staffMeta.totalPages}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      aria-label="Trang trước"
                      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                      disabled={!staffMeta.hasPreviousPage}
                      onClick={() => onPageChange(staffMeta.page - 1)}
                      type="button"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      aria-label="Trang sau"
                      className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
                      disabled={!staffMeta.hasNextPage}
                      onClick={() => onPageChange(staffMeta.page + 1)}
                      type="button"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </section>
          );
        })()
      ) : (
        <RequestTable
          calendarRequests={requests}
          enableFilters
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
          title="Tất cả đơn trong hệ thống"
        />
      )}

      <AdminCreateStaffModal
        currentRole={currentRole}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateStaff={onCreateStaff}
        roles={roles}
        staffs={staffs}
      />

      <AdminStaffDetailModal
        isLoadingStaffDetail={isLoadingStaffDetail}
        isOpen={isStaffDetailOpen}
        onClose={() => setIsStaffDetailOpen(false)}
        selectedStaff={selectedStaff}
      />
    </div>
  );
}
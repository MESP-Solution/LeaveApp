"use client";

import { useState } from "react";
import { useAdminTab } from "@/lib/admin-tab-context";
import { findRoleName } from "@/lib/leave-app-helpers";
import type { LeaveRequestPaginationMeta } from "@/lib/leave-requests-api";
import { fetchStaffById } from "@/lib/staff-api";
import type { LeaveRequestRecord, RoleRecord, StaffRecord } from "@/types/leave-app";
import { RequestTable } from "./request-table";
import { SectionHeader } from "./section-header";
import { useToast } from "./toast";

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
  const hasAdmin = staffs.some((staff) => findRoleName(staff) === "ADMIN");
  const roleOptions = getRoleOptions(currentRole, hasAdmin, roles);
  const defaultRoleId = roleOptions[0]?.value ?? 1;

  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffRecord>();
  const [isStaffDetailOpen, setIsStaffDetailOpen] = useState(false);
  const [isLoadingStaffDetail, setIsLoadingStaffDetail] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const { activeTab } = useAdminTab();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    smtpPass: "",
    roleId: defaultRoleId,
    leaveCredit: 12,
  });
  const selectedRoleId = roleOptions.some((option) => option.value === form.roleId)
    ? form.roleId
    : defaultRoleId;

  async function handleCreateStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim() || !form.smtpPass.trim()) {
      toast.warning("Vui lòng nhập đầy đủ họ tên, email, mật khẩu và SMTP.");
      return;
    }

    if (form.password.length < 8 || form.smtpPass.trim().length < 8) {
      toast.warning("Mật khẩu đăng nhập và SMTP phải có tối thiểu 8 ký tự.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateStaff({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        smtpPass: form.smtpPass.trim(),
        roleId: Number(selectedRoleId),
        leaveCredit: Number(form.leaveCredit),
      });
      setForm({
        fullName: "",
        email: "",
        password: "",
        smtpPass: "",
        roleId: defaultRoleId,
        leaveCredit: 12,
      });
      toast.success("Tạo nhân viên thành công.");
      setIsCreateModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tạo nhân viên thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

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
      {activeTab === "hr" ? (
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
            : staffMeta?.totalItems ?? "-";

          return (
            <section className="flex min-h-0 flex-col rounded-md border border-slate-200 bg-white p-4">
              <SectionHeader
                title="Quản trị nhân sự"
                description="Quản lý tài khoản và vai trò từ dữ liệu máy chủ."
              />
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 p-3">
                <p className="text-sm text-slate-600">
                  {isSearching ? "Kết quả tìm kiếm" : "Tổng nhân sự"}:{" "}
                  <span className="font-medium text-slate-900">{totalCount}</span>
                </p>
                <button
                  className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
                  onClick={() => setIsCreateModalOpen(true)}
                  type="button"
                >
                  Thêm nhân sự
                </button>
              </div>

              <label className="mb-3 grid gap-1 text-sm font-medium text-slate-700">
                Tìm kiếm nhân sự
                <input
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
                  onChange={(event) => setStaffSearch(event.target.value)}
                  placeholder="Tìm theo họ tên hoặc email"
                  type="search"
                  value={staffSearch}
                />
              </label>

              {!isSearching && staffMeta && staffMeta.totalPages > 1 ? (
                <div className="mb-3 flex items-center justify-between gap-3 text-sm text-slate-600">
                  <p>
                    Trang <span className="font-medium text-slate-900">{staffMeta.page}</span> /{" "}
                    <span className="font-medium text-slate-900">{staffMeta.totalPages}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 disabled:bg-slate-100"
                      disabled={!staffMeta.hasPreviousPage}
                      onClick={() => onPageChange(staffMeta.page - 1)}
                      type="button"
                    >
                      Trước
                    </button>
                    <button
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 disabled:bg-slate-100"
                      disabled={!staffMeta.hasNextPage}
                      onClick={() => onPageChange(staffMeta.page + 1)}
                      type="button"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              ) : null}

              {displayedStaffs.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
                  {isSearching
                    ? "Không tìm thấy nhân sự phù hợp."
                    : "Chưa có nhân sự nào."}
                </p>
              ) : (
                <div className="grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                  {displayedStaffs.map((staff) => (
                    <div
                      className="flex flex-col items-start rounded-md border border-slate-200 bg-white p-2.5 text-left text-xs transition-colors hover:bg-slate-50"
                      key={staff.id}
                    >
                      <button
                        className="w-full rounded text-left focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1"
                        onClick={() => void handleOpenStaffDetail(staff.id)}
                        type="button"
                      >
                        <div className="flex w-full items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-950 truncate">{staff.fullName}</p>
                            <p className="text-slate-600 truncate">{staff.email}</p>
                          </div>
                          <span className="flex-shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-medium text-slate-700 whitespace-nowrap">
                            {findRoleName(staff)}
                          </span>
                        </div>
                      </button>
                      <div className="mt-1.5 flex w-full items-center justify-between gap-2">
                        <p className="text-slate-700">Phép: <span className="font-medium">{staff.leaveCredit}</span></p>
                        <button
                          className="rounded border border-rose-200 px-2 py-0.5 font-medium text-rose-700 hover:bg-rose-50"
                          onClick={() => void handleDeleteStaff(staff.id)}
                          type="button"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))}
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

      {isCreateModalOpen ? (
        <div className={modalOverlayClassName} role="dialog" aria-modal="true">
          <div className={modalCardClassName}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Thêm nhân sự</h3>
                <p className="mt-1 text-sm text-slate-600">Tạo nhân viên mới trong hệ thống.</p>
              </div>
              <button
                className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700"
                onClick={() => setIsCreateModalOpen(false)}
                type="button"
              >
                Đóng
              </button>
            </div>
            <form className="mt-4 grid gap-3" onSubmit={handleCreateStaff}>
              <label className={fieldLabelClassName}>
                Họ tên
                <input
                  className={inputClassName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, fullName: event.target.value }))
                  }
                  placeholder="Nhập họ tên nhân sự"
                  title="Họ tên nhân sự"
                  value={form.fullName}
                />
              </label>
              <label className={fieldLabelClassName}>
                Email
                <input
                  className={inputClassName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="Nhập email đăng nhập"
                  title="Email đăng nhập"
                  type="email"
                  value={form.email}
                />
              </label>
              <label className={fieldLabelClassName}>
                Mật khẩu
                <input
                  className={inputClassName}
                  minLength={8}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Tối thiểu 8 ký tự"
                  title="Mật khẩu đăng nhập"
                  type="password"
                  value={form.password}
                />
              </label>
              <label className={fieldLabelClassName}>
                Mật khẩu SMTP
                <input
                  className={inputClassName}
                  minLength={8}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, smtpPass: event.target.value }))
                  }
                  placeholder="Nhập mật khẩu SMTP hoặc app password"
                  title="Mật khẩu SMTP dùng để gửi email"
                  type="password"
                  value={form.smtpPass}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className={fieldLabelClassName}>
                  Vai trò
                  <select
                    className={inputClassName}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, roleId: Number(event.target.value) }))
                    }
                    title="Vai trò của nhân sự"
                    value={selectedRoleId}
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} disabled={option.disabled} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={fieldLabelClassName}>
                  Ngày phép
                  <input
                    className={inputClassName}
                    min={1}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, leaveCredit: Number(event.target.value) }))
                    }
                    title="Số ngày phép ban đầu"
                    type="number"
                    value={form.leaveCredit}
                  />
                </label>
              </div>
              <button
                className="mt-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-400"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Đang tạo..." : "Tạo nhân viên"}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {isStaffDetailOpen ? (
        <div className={modalOverlayClassName} role="dialog" aria-modal="true">
          <div className={modalCardClassName}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Thông tin nhân sự</h3>
                <p className="mt-1 text-sm text-slate-600">Chi tiết từ dữ liệu máy chủ.</p>
              </div>
              <button
                className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700"
                onClick={() => setIsStaffDetailOpen(false)}
                type="button"
              >
                Đóng
              </button>
            </div>
            {isLoadingStaffDetail ? (
              <p className="mt-4 text-sm text-slate-600">Đang tải...</p>
            ) : selectedStaff ? (
              <div className="mt-4 grid gap-2 text-sm">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-slate-500">Họ tên</p>
                  <p className="font-medium text-slate-950">{selectedStaff.fullName}</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-slate-500">Email</p>
                  <p className="font-medium text-slate-950">{selectedStaff.email}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-slate-500">Vai trò</p>
                    <p className="font-medium text-slate-950">{findRoleName(selectedStaff)}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-slate-500">Ngày phép</p>
                    <p className="font-medium text-slate-950">{selectedStaff.leaveCredit}</p>
                  </div>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-slate-500">Mã nhân sự</p>
                  <p className="font-medium text-slate-950">{selectedStaff.id}</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-slate-500">Ngày tạo</p>
                  <p className="font-medium text-slate-950">{selectedStaff.createdAt}</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600">Không có dữ liệu.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const inputClassName =
  "rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500";
const fieldLabelClassName = "grid gap-1 text-sm font-medium text-slate-700";

const modalOverlayClassName =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4";
const modalCardClassName =
  "w-full max-w-lg rounded-md border border-slate-200 bg-white p-5 shadow-xl";

function getRoleOptions(
  currentRole: "ADMIN" | "HEAD" | "MANAGER",
  hasAdmin: boolean,
  roles: RoleRecord[],
): Array<{ value: number; label: string; disabled?: boolean }> {
  const all = roles.map((role) => ({
    value: role.id,
    label: role.name,
    disabled: role.name === "ADMIN" ? hasAdmin : false,
  }));

  if (currentRole === "ADMIN") {
    return all;
  }

  if (currentRole === "MANAGER") {
    return all.filter((opt) => opt.label === "STAFF");
  }

  return all;
}

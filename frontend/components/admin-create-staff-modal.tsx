"use client";

import { useState } from "react";
import { X, User, Mail, Shield, Award, Key } from "lucide-react";
import type { RoleRecord, StaffRecord, StaffRoleName } from "@/types/leave-app";
import { findRoleName } from "@/lib/leave-app-helpers";
import { useToast } from "./toast";

const roleLabelByName: Record<StaffRoleName, string> = {
  ADMIN: "Admin",
  HEAD: "Trưởng phòng",
  MANAGER: "Quản lý",
  STAFF: "Nhân viên",
};

interface AdminCreateStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  roles: RoleRecord[];
  currentRole: "ADMIN" | "HEAD" | "MANAGER";
  staffs: StaffRecord[];
  onCreateStaff: (input: {
    fullName: string;
    email: string;
    password: string;
    smtpPass: string;
    roleId?: number;
    leaveCredit?: number;
  }) => Promise<void>;
}

export function AdminCreateStaffModal({
  isOpen,
  onClose,
  roles,
  currentRole,
  staffs,
  onCreateStaff,
}: AdminCreateStaffModalProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasAdmin = staffs.some((staff) => findRoleName(staff) === "ADMIN");
  const roleOptions = getRoleOptions(currentRole, hasAdmin, roles);
  const defaultRoleId = roleOptions[0]?.value ?? 1;

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    roleId: defaultRoleId,
    leaveCredit: 12,
  });

  const [hiddenMailCredential, setHiddenMailCredential] = useState(() =>
    createHiddenMailCredential()
  );

  const selectedRoleId = roleOptions.some((option) => option.value === form.roleId)
    ? form.roleId
    : defaultRoleId;

  if (!isOpen) return null;

  async function handleCreateStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim()) {
      toast.warning("Vui lòng nhập đầy đủ họ tên, email và mật khẩu.");
      return;
    }

    if (form.password.length < 8) {
      toast.warning("Mật khẩu đăng nhập phải có tối thiểu 8 ký tự.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateStaff({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        smtpPass: hiddenMailCredential,
        roleId: Number(selectedRoleId),
        leaveCredit: Number(form.leaveCredit),
      });
      setForm({
        fullName: "",
        email: "",
        password: "",
        roleId: defaultRoleId,
        leaveCredit: 12,
      });
      setHiddenMailCredential(createHiddenMailCredential());
      toast.success("Tạo nhân viên thành công.");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tạo nhân viên thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 transition-all duration-305 animate-modal-fade"
      role="dialog"
      aria-modal="true"
    >
      {/* Custom keyframe styles for animation */}
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

      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl animate-modal-scale">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950 tracking-tight">Thêm nhân sự</h3>
            <p className="mt-1 text-xs text-slate-500 font-medium">Tạo nhân viên mới trong hệ thống.</p>
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

        <form className="mt-5 grid gap-4" onSubmit={handleCreateStaff}>
          {/* Full Name */}
          <div className="grid gap-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Họ tên nhân viên
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition-all duration-150 placeholder:text-slate-400 focus:border-slate-950 focus:bg-white focus:ring-1 focus:ring-slate-950/10"
                onChange={(event) =>
                  setForm((current) => ({ ...current, fullName: event.target.value }))
                }
                placeholder="Nhập họ và tên cụ thể..."
                type="text"
                value={form.fullName}
              />
            </div>
          </div>

          {/* Email */}
          <div className="grid gap-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Địa chỉ Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition-all duration-150 placeholder:text-slate-400 focus:border-slate-950 focus:bg-white focus:ring-1 focus:ring-slate-950/10"
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="email@congty.com"
                type="email"
                value={form.email}
              />
            </div>
          </div>

          {/* Password */}
          <div className="grid gap-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Mật khẩu đăng nhập
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Key className="w-4 h-4" />
              </div>
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition-all duration-150 placeholder:text-slate-400 focus:border-slate-950 focus:bg-white focus:ring-1 focus:ring-slate-950/10"
                minLength={8}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="Tối thiểu 8 ký tự..."
                type="password"
                value={form.password}
              />
            </div>
          </div>

          {/* Hidden Mail credential */}
          <input
            name="smtpPass"
            readOnly
            type="hidden"
            value={hiddenMailCredential}
          />

          <div className="grid grid-cols-2 gap-4">
            {/* Role select */}
            <div className="grid gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Vai trò hệ thống
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Shield className="w-4 h-4" />
                </div>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition-all duration-150 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%20%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[size:1.25rem] bg-[position:right_0.5rem_center] bg-no-repeat focus:border-slate-950 focus:bg-white focus:ring-1 focus:ring-slate-950/10 cursor-pointer"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, roleId: Number(event.target.value) }))
                  }
                  value={selectedRoleId}
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} disabled={option.disabled} value={option.value}>
                      {roleLabelByName[option.label as StaffRoleName] || option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Leave credit */}
            {/* <div className="grid gap-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Ngày phép khởi đầu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Award className="w-4 h-4" />
                </div>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition-all duration-150 placeholder:text-slate-400 focus:border-slate-950 focus:bg-white focus:ring-1 focus:ring-slate-950/10"
                  min={1}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, leaveCredit: Number(event.target.value) }))
                  }
                  type="number"
                  value={form.leaveCredit}
                />
              </div>
            </div> */}
          </div>

          <button
            className="w-full relative overflow-hidden flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-900 active:scale-[0.98] active:translate-y-[0.5px] transition-all duration-150 disabled:cursor-not-allowed disabled:bg-slate-350 mt-2 cursor-pointer"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                <span>Đang xử lý tạo...</span>
              </>
            ) : (
              <span>Tạo tài khoản nhân viên</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function getRoleOptions(
  currentRole: "ADMIN" | "HEAD" | "MANAGER",
  hasAdmin: boolean,
  roles: RoleRecord[]
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

function createHiddenMailCredential(): string {
  const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `hidden-mail-${randomId}`;
}

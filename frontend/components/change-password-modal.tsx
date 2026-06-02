"use client";

import { useState } from "react";
import { X, Key, Lock, ShieldCheck } from "lucide-react";
import { changePassword } from "@/lib/change-password-api";
import { useToast } from "./toast";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMPTY_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  function handleClose() {
    setForm(EMPTY_FORM);
    onClose();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.currentPassword.trim() || !form.newPassword.trim()) {
      toast.warning("Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.");
      return;
    }
    if (form.newPassword.length < 8) {
      toast.warning("Mật khẩu mới phải có tối thiểu 8 ký tự.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.warning("Xác nhận mật khẩu mới không khớp.");
      return;
    }
    if (form.newPassword === form.currentPassword) {
      toast.warning("Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(form.currentPassword, form.newPassword);
      toast.success("Đổi mật khẩu thành công.");
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Đổi mật khẩu thất bại.");
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
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalScaleUp { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-modal-fade { animation: modalFadeIn 0.2s ease-out forwards; }
        .animate-modal-scale { animation: modalScaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />

      <div className="absolute inset-0 bg-transparent animate-modal-fade" onClick={handleClose} />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl animate-modal-scale">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950 tracking-tight">Đổi mật khẩu</h3>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Nhập mật khẩu hiện tại để xác nhận thay đổi.
            </p>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all shadow-sm cursor-pointer"
            onClick={handleClose}
            type="button"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
          <PasswordField
            label="Mật khẩu hiện tại"
            icon={<Key className="w-4 h-4" />}
            value={form.currentPassword}
            placeholder="Nhập mật khẩu hiện tại..."
            autoComplete="current-password"
            onChange={(value) => setForm((c) => ({ ...c, currentPassword: value }))}
          />
          <PasswordField
            label="Mật khẩu mới"
            icon={<Lock className="w-4 h-4" />}
            value={form.newPassword}
            placeholder="Tối thiểu 8 ký tự..."
            autoComplete="new-password"
            onChange={(value) => setForm((c) => ({ ...c, newPassword: value }))}
          />
          <PasswordField
            label="Xác nhận mật khẩu mới"
            icon={<ShieldCheck className="w-4 h-4" />}
            value={form.confirmPassword}
            placeholder="Nhập lại mật khẩu mới..."
            autoComplete="new-password"
            onChange={(value) => setForm((c) => ({ ...c, confirmPassword: value }))}
          />

          <button
            className="w-full relative overflow-hidden flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-900 active:scale-[0.98] active:translate-y-[0.5px] transition-all duration-150 disabled:cursor-not-allowed disabled:bg-slate-400 mt-2 cursor-pointer"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                <span>Đang đổi mật khẩu...</span>
              </>
            ) : (
              <span>Xác nhận đổi mật khẩu</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  icon,
  value,
  placeholder,
  autoComplete,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  placeholder: string;
  autoComplete: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
          {icon}
        </div>
        <input
          className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition-all duration-150 placeholder:text-slate-400 focus:border-slate-950 focus:bg-white focus:ring-1 focus:ring-slate-950/10"
          type="password"
          autoComplete={autoComplete}
          minLength={8}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

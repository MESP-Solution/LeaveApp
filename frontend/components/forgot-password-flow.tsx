"use client";

import { useState } from "react";
import { X, Mail, KeyRound, Lock, ShieldCheck } from "lucide-react";
import {
  requestResetOtp,
  verifyResetOtp,
  resetPassword,
} from "@/lib/change-password-api";
import { useToast } from "./toast";

interface ForgotPasswordFlowProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "email" | "otp" | "reset";

export function ForgotPasswordFlow({ isOpen, onClose }: ForgotPasswordFlowProps) {
  const toast = useToast();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  function handleClose() {
    setStep("email");
    setEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    onClose();
  }

  async function handleRequestOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      toast.warning("Vui lòng nhập email.");
      return;
    }
    setIsSubmitting(true);
    try {
      await requestResetOtp(email.trim());
      toast.success("Nếu email tồn tại, mã OTP đã được gửi.");
      setStep("otp");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gửi OTP thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (otp.trim().length !== 6) {
      toast.warning("Mã OTP gồm 6 chữ số.");
      return;
    }
    setIsSubmitting(true);
    try {
      await verifyResetOtp(email.trim(), otp.trim());
      toast.success("Xác thực OTP thành công.");
      setStep("reset");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xác thực OTP thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8) {
      toast.warning("Mật khẩu mới phải có tối thiểu 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.warning("Xác nhận mật khẩu mới không khớp.");
      return;
    }
    setIsSubmitting(true);
    try {
      await resetPassword(email.trim(), otp.trim(), newPassword);
      toast.success("Đặt lại mật khẩu thành công. Vui lòng đăng nhập.");
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Đặt lại mật khẩu thất bại.");
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
            <h3 className="text-lg font-bold text-slate-950 tracking-tight">Quên mật khẩu</h3>
            <p className="mt-1 text-xs text-slate-500 font-medium">{stepHint(step)}</p>
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

        <StepIndicator step={step} />

        {step === "email" && (
          <form className="mt-2 grid gap-4" onSubmit={handleRequestOtp}>
            <Field label="Địa chỉ Email" icon={<Mail className="w-4 h-4" />}>
              <input
                className={inputClass}
                type="email"
                autoComplete="email"
                value={email}
                placeholder="email@congty.com"
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <SubmitButton isSubmitting={isSubmitting} label="Gửi mã OTP" busyLabel="Đang gửi..." />
          </form>
        )}

        {step === "otp" && (
          <form className="mt-2 grid gap-4" onSubmit={handleVerifyOtp}>
            <Field label="Mã OTP (6 chữ số)" icon={<KeyRound className="w-4 h-4" />}>
              <input
                className={`${inputClass} tracking-[0.4em] font-semibold`}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                placeholder="••••••"
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
              />
            </Field>
            <SubmitButton isSubmitting={isSubmitting} label="Xác thực OTP" busyLabel="Đang xác thực..." />
            <button
              type="button"
              className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
              onClick={() => setStep("email")}
            >
              ← Đổi email khác
            </button>
          </form>
        )}

        {step === "reset" && (
          <form className="mt-2 grid gap-4" onSubmit={handleResetPassword}>
            <Field label="Mật khẩu mới" icon={<Lock className="w-4 h-4" />}>
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={newPassword}
                placeholder="Tối thiểu 8 ký tự..."
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </Field>
            <Field label="Xác nhận mật khẩu mới" icon={<ShieldCheck className="w-4 h-4" />}>
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                placeholder="Nhập lại mật khẩu mới..."
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </Field>
            <SubmitButton isSubmitting={isSubmitting} label="Đặt lại mật khẩu" busyLabel="Đang xử lý..." />
          </form>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition-all duration-150 placeholder:text-slate-400 focus:border-slate-950 focus:bg-white focus:ring-1 focus:ring-slate-950/10";

function stepHint(step: Step): string {
  switch (step) {
    case "email":
      return "Nhập email để nhận mã OTP đặt lại mật khẩu.";
    case "otp":
      return "Nhập mã OTP đã gửi tới email của bạn.";
    case "reset":
      return "Đặt mật khẩu mới cho tài khoản.";
  }
}

function StepIndicator({ step }: { step: Step }) {
  const order: Step[] = ["email", "otp", "reset"];
  const activeIndex = order.indexOf(step);
  return (
    <div className="flex items-center gap-1.5 my-4">
      {order.map((_, index) => (
        <div
          key={index}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            index <= activeIndex ? "bg-slate-950" : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
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
        {children}
      </div>
    </div>
  );
}

function SubmitButton({
  isSubmitting,
  label,
  busyLabel,
}: {
  isSubmitting: boolean;
  label: string;
  busyLabel: string;
}) {
  return (
    <button
      className="w-full relative overflow-hidden flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-900 active:scale-[0.98] active:translate-y-[0.5px] transition-all duration-150 disabled:cursor-not-allowed disabled:bg-slate-400 mt-1 cursor-pointer"
      disabled={isSubmitting}
      type="submit"
    >
      {isSubmitting ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <span>{busyLabel}</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}

"use client";

import { useState } from "react";
import { loginWithEmailPassword } from "@/lib/auth-api";
import { saveAccessToken } from "@/lib/session";
import type { StaffRecord } from "@/types/leave-app";
import { useToast } from "./toast";
import Image from "next/image";

export function LoginScreen({
  onLogin,
}: {
  onLogin: (staff: StaffRecord) => void;
}) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.warning("Vui lòng nhập email và mật khẩu.");
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await loginWithEmailPassword(email.trim(), password);
      saveAccessToken(session.accessToken);
      toast.success("Đăng nhập thành công.");
      onLogin(session.staff);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Đăng nhập thất bại. Vui lòng thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-[100dvh] flex flex-col md:grid md:grid-cols-2 bg-[#f6f7f9] overflow-hidden">
      {/* Inject custom CSS keyframes and animations directly in code */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          opacity: 0;
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      <section className="relative hidden md:flex flex-col justify-between p-12 bg-[#080d19] text-white overflow-hidden">
        {/* Subtle, beautiful radial mesh gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,var(--foreground),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,var(--foreground),transparent_60%)] pointer-events-none" />
        {/* Subtle grid background texture */}
        <div className="absolute inset-0 bg-[linear-gradient(var(--foreground),transparent_1px),linear-gradient(90deg,var(--foreground)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3 animate-fade-in-up" style={{ animationDelay: "100ms" }}>

          <Image src="/main-logo.png" alt="Logo" width={150} height={150} />

        </div>

        {/* Central Typographic Copy */}
        <div className="relative z-10 my-auto max-w-md">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter leading-none text-white animate-fade-in-up" style={{ animationDelay: "250ms" }}>
            LeaveManagement
          </h1>
          <p className="mt-4 text-base text-slate-400 leading-relaxed max-w-[40ch] animate-fade-in-up" style={{ animationDelay: "350ms" }}>
            Hệ thống quản lý nghỉ phép
          </p>
        </div>


      </section>

      {/* RIGHT PANEL: Pure Premium Minimal Credential Form Area */}
      <section className="flex flex-1 items-center justify-center p-6 md:p-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile Brand Header */}
          <div className="md:hidden flex items-center justify-center gap-2.5 mb-8 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-slate-900 text-white">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="6" width="14" height="14" rx="3" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="8" y="2" width="14" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2" />
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight text-slate-950">LeaveManagement</span>
          </div>

          {/* Form Header */}
          <header className="animate-fade-in-up" style={{ animationDelay: "150ms" }}>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Chào mừng quay trở lại</h2>
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
              Điền thông tin tài khoản bên dưới để tiếp tục
            </p>
          </header>

          {/* Credential Form */}
          <form className="mt-8 grid gap-5 animate-fade-in-up" onSubmit={handleSubmit} style={{ animationDelay: "250ms" }}>
            {/* Email Field */}
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Địa chỉ email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  autoComplete="email"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-slate-950 focus:bg-white focus:ring-1 focus:ring-slate-950/10"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="an@company.local"
                  type="email"
                  value={email}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="grid gap-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Mật khẩu đăng nhập
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-slate-950 focus:bg-white focus:ring-1 focus:ring-slate-950/10"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Nhập mật khẩu"
                  type="password"
                  value={password}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              className="mt-2 w-full relative overflow-hidden flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-900 active:scale-[0.98] active:translate-y-[0.5px] transition-all duration-150 disabled:cursor-not-allowed disabled:bg-slate-400 animate-fade-in-up"
              disabled={isSubmitting}
              style={{ animationDelay: "350ms" }}
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  <span>Đang kết nối...</span>
                </>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

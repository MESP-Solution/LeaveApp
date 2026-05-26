"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

interface MobileLoginViewProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  isSubmitting: boolean;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function MobileLoginView({
  email,
  setEmail,
  password,
  setPassword,
  isSubmitting,
  handleSubmit,
}: MobileLoginViewProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative min-h-[100dvh] flex flex-col bg-[#f8fafc] text-slate-900 overflow-x-hidden selection:bg-slate-950 selection:text-white">
      {/* Inject custom visual animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(32px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes floatLogo {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.35; }
        }
        .animate-slide-up {
          animation: slideUp 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in {
          animation: fadeIn 0.8s ease-out forwards;
        }
        .animate-pulse-glow {
          animation: pulseGlow 3s ease-in-out infinite;
        }
      `}} />

      {/* TOP BRAND HERO AREA: Premium dark backdrop with flowing mesh accents */}
      <section className="relative h-[38vh] flex flex-col justify-end items-center px-6 pb-12 bg-[#080d19] overflow-hidden text-white">
        {/* Abstract glowing mesh elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_30%_30%,rgba(59,130,246,0.25),transparent_60%)] pointer-events-none" />
        <div className="absolute top-[20%] right-[-20%] w-[100%] h-[100%] bg-[radial-gradient(circle_at_70%_70%,rgba(99,102,241,0.2),transparent_50%)] pointer-events-none" />

        {/* Glowing aura behind the logo */}
        <div className="absolute w-48 h-48 rounded-full bg-blue-500/10 blur-3xl top-[25%] pointer-events-none animate-pulse-glow" />

        {/* Floating Brand Logo Container */}
        <div className="relative z-10 flex flex-col items-center gap-4 text-center animate-float-logo">
          <Image
            src="/main-logo.png"
            alt="LeaveApp Logo"
            width={200}
            height={200}
            className="object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)] animate-slide-up"
            priority
          />

          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              LeaveManagement
            </h1>
            <p className="text-xs font-medium text-slate-400/90 tracking-widest uppercase">
              Hệ thống quản lý nghỉ phép
            </p>
          </div>
        </div>
      </section>

      {/* BOTTOM CONTAINER: High-end floating card for credentials input */}
      <section className="relative flex-1 -mt-6 bg-[#f8fafc] rounded-t-[28px] z-20 shadow-[0_-12px_40px_rgba(8,13,25,0.08)] flex flex-col justify-between px-6 pt-8 pb-6 animate-slide-up">
        {/* Soft drag indicator accent line at the card header */}
        <div className="mx-auto w-12 h-1 rounded-full bg-slate-300/80 mb-6" />

        <div className="w-full max-w-sm mx-auto">
          {/* Card Welcome Header */}
          <header className="mb-6 text-center space-y-1">

            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Chào mừng quay trở lại
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Điền thông tin tài khoản bên dưới để tiếp tục
            </p>
          </header>

          {/* Form Element */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email Field Container */}
            <div className="space-y-1.5 group">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block transition-colors duration-200 group-focus-within:text-slate-800">
                Địa chỉ Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 transition-colors duration-200 group-focus-within:text-slate-700">
                  <Mail className="h-4.5 w-4.5 stroke-[2]" />
                </div>
                <input
                  autoComplete="email"
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/80 pl-11 pr-4 py-3 text-sm font-normal text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-slate-800 focus:bg-white focus:ring-4 focus:ring-slate-900/5 shadow-sm"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="an@company.local"
                  type="email"
                  value={email}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Password Field Container */}
            <div className="space-y-1.5 group">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block transition-colors duration-200 group-focus-within:text-slate-800">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 transition-colors duration-200 group-focus-within:text-slate-700">
                  <Lock className="h-4.5 w-4.5 stroke-[2]" />
                </div>
                <input
                  autoComplete="current-password"
                  className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/80 pl-11 pr-11 py-3 text-sm font-normal text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-slate-800 focus:bg-white focus:ring-4 focus:ring-slate-900/5 shadow-sm"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Nhập mật khẩu của bạn"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors active:scale-90"
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5 stroke-[2]" />
                  ) : (
                    <Eye className="h-4.5 w-4.5 stroke-[2]" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              className="w-full h-12 relative overflow-hidden flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(15,23,42,0.15)] hover:bg-slate-800 active:scale-[0.97] active:translate-y-[0.5px] transition-all duration-150 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none disabled:active:scale-100"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Đang kết nối...</span>
                </>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>
          </form>
        </div>

        {/* Brand Footer */}
        <footer className="mt-8 text-center text-[10px] text-slate-400/90 font-medium tracking-wide animate-fade-in">
          Hệ thống quản lý nghỉ phép nội bộ • LeaveApp
        </footer>
      </section>
    </div>
  );
}

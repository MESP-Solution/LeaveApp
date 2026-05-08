"use client";

import { useState } from "react";
import { loginWithEmailPassword } from "@/lib/auth-api";
import { saveAccessToken } from "@/lib/session";
import type { StaffRecord } from "@/types/leave-app";
import { useToast } from "./toast";

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
    <div className="flex w-full items-center justify-center bg-slate-50 p-6 lg:grid-cols-[1fr_420px]">
      

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h3 className="text-base font-semibold text-slate-950">Thông tin đăng nhập</h3>
        <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Email
            <input
              autoComplete="email"
              className={inputClassName}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="an@company.local"
              type="email"
              value={email}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Mật khẩu
            <input
              autoComplete="current-password"
              className={inputClassName}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhập mật khẩu"
              type="password"
              value={password}
            />
          </label>
          <button
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </section>
    </div>
  );
}

const inputClassName =
  "rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-sky-500";

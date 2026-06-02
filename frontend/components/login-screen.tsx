"use client";

import { useState } from "react";
import { loginWithEmailPassword } from "@/lib/auth-api";
import { saveAccessToken } from "@/lib/session";
import type { StaffRecord } from "@/types/leave-app";
import { useToast } from "./toast";
import { DesktopLoginView } from "./desktop-login-view";
import { MobileLoginView } from "./mobile-login-view";
import { ForgotPasswordFlow } from "./forgot-password-flow";

export function LoginScreen({
  onLogin,
}: {
  onLogin: (staff: StaffRecord) => void;
}) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

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
    <>
      <div className="hidden md:block">
        <DesktopLoginView
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          isSubmitting={isSubmitting}
          handleSubmit={handleSubmit}
          onForgotPassword={() => setIsForgotPasswordOpen(true)}
        />
      </div>
      <div className="block md:hidden">
        <MobileLoginView
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          isSubmitting={isSubmitting}
          handleSubmit={handleSubmit}
          onForgotPassword={() => setIsForgotPasswordOpen(true)}
        />
      </div>
      <ForgotPasswordFlow
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </>
  );
}

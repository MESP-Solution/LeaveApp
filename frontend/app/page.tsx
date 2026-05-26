"use client";

import { AppShell } from "@/components/app-shell";
import { LeaveDashboard } from "@/components/leave-dashboard";
import { ToastProvider } from "@/components/toast";
import { AdminTabProvider } from "@/lib/admin-tab-context";
import { CurrentUserProvider, useCurrentUser } from "@/lib/current-user-context";

function HomeContent() {
  const { currentUser, isRestoringSession } = useCurrentUser();

  if (isRestoringSession) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f6f7f9]">
        <div className="flex flex-col items-center gap-3">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
          <span className="text-sm font-medium text-slate-600">Đang tải phiên đăng nhập...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LeaveDashboard />;
  }

  return (
    <AppShell>
      <LeaveDashboard />
    </AppShell>
  );
}

export default function Home() {
  return (
    <ToastProvider>
      <CurrentUserProvider>
        <AdminTabProvider>
          <HomeContent />
        </AdminTabProvider>
      </CurrentUserProvider>
    </ToastProvider>
  );
}


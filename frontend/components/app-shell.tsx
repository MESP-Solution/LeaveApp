"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { useAdminTab } from "@/lib/admin-tab-context";
import { useCurrentUser } from "@/lib/current-user-context";
import { findRoleName } from "@/lib/leave-app-helpers";
import {
  clearAccessToken,
  readAccessToken,
  subscribeToAuthChanges,
} from "@/lib/session";
import type { StaffRoleName } from "@/types/leave-app";

const roleLabelByName: Record<StaffRoleName, string> = {
  ADMIN: "Admin",
  HEAD: "Head",
  MANAGER: "Manager",
  STAFF: "Nhân viên",
};

export function AppShell({ children }: { children: ReactNode }) {
  const hasToken = useSyncExternalStore(
    subscribeToAuthChanges,
    () => Boolean(readAccessToken()),
    () => false,
  );
  const { currentUser } = useCurrentUser();
  const { activeTab, setActiveTab } = useAdminTab();

  const currentRole = currentUser ? findRoleName(currentUser) : undefined;
  const showAdminTabs =
    hasToken && (currentRole === "ADMIN" || currentRole === "HEAD" || currentRole === "MANAGER");

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    clearAccessToken();
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#172033]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-shrink-0">
              <p className="text-sm font-medium text-slate-500">
                Giao diện quản lý nghỉ phép
              </p>
              <h1 className="text-2xl font-semibold tracking-normal text-slate-950">
                LeaveManagement
              </h1>
            </div>

            {showAdminTabs ? (
              <nav
                aria-label="Khu vực quản trị"
                className="order-3 flex flex-1 items-center justify-center gap-8 lg:order-none lg:flex-1"
              >
                <HeaderTabButton
                  active={activeTab === "hr"}
                  label="Quản trị nhân sự"
                  onClick={() => setActiveTab("hr")}
                />
                <HeaderTabButton
                  active={activeTab === "leave"}
                  label="Quản lý nghỉ phép"
                  onClick={() => setActiveTab("leave")}
                />
              </nav>
            ) : null}

            {hasToken ? (
              <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
                {currentUser ? (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 text-right">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {currentUser.fullName}
                      </p>
                      <p className="truncate text-xs text-slate-600">
                        {currentUser.email}
                      </p>
                    </div>
                    <span className="flex-shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 whitespace-nowrap">
                      {roleLabelByName[findRoleName(currentUser)]}
                    </span>
                  </div>
                ) : null}
                <button
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={handleLogout}
                  type="button"
                >
                  Đăng xuất
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

function HeaderTabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={
        active
          ? "relative whitespace-nowrap pb-2 text-sm font-semibold text-slate-950 after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-slate-950 after:content-['']"
          : "relative whitespace-nowrap pb-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
      }
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

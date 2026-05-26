"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { LogOut, LayoutDashboard, Users, CalendarMinus } from "lucide-react";
import { useAdminTab, type AdminTab } from "@/lib/admin-tab-context";
import { useCurrentUser } from "@/lib/current-user-context";
import { findRoleName } from "@/lib/leave-app-helpers";
import {
  clearAccessToken,
  readAccessToken,
  subscribeToAuthChanges,
} from "@/lib/session";

const NAV_TABS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "hr",        label: "Nhân sự",   icon: Users           },
  { id: "leave",     label: "Nghỉ phép", icon: CalendarMinus   },
];

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
    hasToken &&
    (currentRole === "ADMIN" || currentRole === "HEAD" || currentRole === "MANAGER");

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    clearAccessToken();
    window.location.reload();
  }

  return (
    <div className="min-h-screen text-slate-900" style={{ background: "oklch(98% 0.004 264)" }}>
      <header
        className="sticky top-0 z-40 w-full"
        style={{
          background: "oklch(100% 0 0)",
          borderBottom: "1px solid oklch(92% 0.008 264)",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:gap-4 sm:py-3 sm:px-6 lg:px-8">

        
          <div className="flex shrink-0 items-center">
            
            <div  >
            <p
              className="text-2sm sm:text-base md:text-lg font-bold leading-tight tracking-tight"
              style={{ color: "oklch(12% 0.006 264)" }}
            >
              LeaveManagement
            </p>
              <p
                className="mt-0.5 text-[10px] leading-none"
                style={{ color: "oklch(58% 0.006 264)" }}
              >
                Quản lý nghỉ phép
              </p>
            </div>
          </div>
 
          {showAdminTabs ? (
            <nav
              aria-label="Khu vực quản trị"
              className="flex items-center gap-0.5 rounded-xl p-0.5"
              style={{
                background: "oklch(95.5% 0.008 264)",
                border: "1px solid oklch(90% 0.01 264)",
              }}
            >
              {NAV_TABS.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    aria-pressed={active}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] transition-all duration-150 active:scale-[0.97] sm:px-3"
                    style={
                      active
                        ? {
                            background: "oklch(100% 0 0)",
                            color: "oklch(14% 0.006 264)",
                            fontWeight: 600,
                            boxShadow:
                              "0 1px 2px oklch(0% 0 0 / 0.07), 0 0 0 1px oklch(89% 0.012 264)",
                          }
                        : {
                            background: "transparent",
                            color: "oklch(55% 0.006 264)",
                            fontWeight: 500,
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "oklch(92% 0.009 264)";
                        e.currentTarget.style.color = "oklch(22% 0.006 264)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "oklch(55% 0.006 264)";
                      }
                    }}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                );
              })}
            </nav>
          ) : null}

          {/* Profile + Logout */}
          {hasToken ? (
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {currentUser && (
                <p
                  className="hidden max-w-[140px] truncate text-2xs underline font-semibold md:block"
                  style={{ color: "oklch(14% 0.006 264)" }}
                >
                  {currentUser.fullName}
                </p>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center justify-center gap-1.5 rounded-lg transition-all duration-150 active:scale-95"
                style={{
                  background: "oklch(100% 0 0)",
                  border: "1px solid oklch(90% 0.01 264)",
                  color: "oklch(52% 0.006 264)",
                  padding: "5px 8px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "oklch(97% 0.006 264)";
                  e.currentTarget.style.color = "oklch(22% 0.006 264)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "oklch(100% 0 0)";
                  e.currentTarget.style.color = "oklch(52% 0.006 264)";
                }}
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden text-xs font-medium sm:inline">Đăng xuất</span>
              </button>
            </div>
          ) : null}

        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
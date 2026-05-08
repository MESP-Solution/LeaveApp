import { AppShell } from "@/components/app-shell";
import { LeaveDashboard } from "@/components/leave-dashboard";
import { ToastProvider } from "@/components/toast";
import { AdminTabProvider } from "@/lib/admin-tab-context";
import { CurrentUserProvider } from "@/lib/current-user-context";

export default function Home() {
  return (
    <ToastProvider>
      <CurrentUserProvider>
        <AdminTabProvider>
          <AppShell>
            <LeaveDashboard />
          </AppShell>
        </AdminTabProvider>
      </CurrentUserProvider>
    </ToastProvider>
  );
}

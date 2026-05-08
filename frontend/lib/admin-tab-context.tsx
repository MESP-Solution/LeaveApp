"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AdminTab = "hr" | "leave";

interface AdminTabContextValue {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
}

const AdminTabContext = createContext<AdminTabContextValue | undefined>(undefined);

export function AdminTabProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<AdminTab>("hr");

  const value = useMemo(() => ({ activeTab, setActiveTab }), [activeTab]);

  return <AdminTabContext.Provider value={value}>{children}</AdminTabContext.Provider>;
}

export function useAdminTab(): AdminTabContextValue {
  const ctx = useContext(AdminTabContext);
  if (!ctx) {
    throw new Error("useAdminTab must be used within an AdminTabProvider");
  }
  return ctx;
}

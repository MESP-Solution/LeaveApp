"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getCurrentStaff } from "@/lib/auth-api";
import type { StaffRecord } from "@/types/leave-app";

interface CurrentUserContextValue {
  currentUser: StaffRecord | undefined;
  setCurrentUser: (staff: StaffRecord | undefined) => void;
  isRestoringSession: boolean;
  restoreError?: string;
}

const CurrentUserContext = createContext<CurrentUserContextValue | undefined>(undefined);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<StaffRecord>();
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [restoreError, setRestoreError] = useState<string>();

  // Restore the session once on mount; consumers (e.g. dashboard) react to currentUser updates.
  useEffect(() => {
    let isActive = true;
    void (async () => {
      try {
        const staff = await getCurrentStaff();
        if (isActive && staff) {
          setCurrentUserState(staff);
        }
      } catch (error) {
        if (isActive) {
          setRestoreError(
            error instanceof Error ? error.message : "Không thể khôi phục phiên đăng nhập.",
          );
        }
      } finally {
        if (isActive) {
          setIsRestoringSession(false);
        }
      }
    })();
    return () => {
      isActive = false;
    };
  }, []);

  const setCurrentUser = useCallback((staff: StaffRecord | undefined) => {
    setCurrentUserState(staff);
  }, []);

  const value = useMemo(
    () => ({ currentUser, setCurrentUser, isRestoringSession, restoreError }),
    [currentUser, setCurrentUser, isRestoringSession, restoreError],
  );

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error("useCurrentUser must be used within a CurrentUserProvider");
  }
  return ctx;
}

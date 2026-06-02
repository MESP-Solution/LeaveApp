import type { StaffRecord, StaffRoleName } from "@/types/leave-app";
import { readApiErrorMessage, unwrapApiResponse as unwrapApiPayload } from "./api-response";
import { roleNameToId as mapRoleNameToId } from "./leave-app-mappers";

interface LoginResponse {
  accessToken: string;
  staff: {
    email: string;
    fullName: string;
    id: number;
    leaveCredit: number;
    role: StaffRoleName;
    departmentId?: number | null;
    department?: string | null;
  };
}

interface AuthMeResponse {
  staff: {
    email: string;
    fullName: string;
    id: number;
    leaveCredit: number;
    role: StaffRoleName;
    departmentId?: number | null;
    department?: string | null;
  };
}

export async function loginWithEmailPassword(
  email: string,
  password: string,
): Promise<{ accessToken: string; staff: StaffRecord }> {
  const response = await fetch("/api/auth/login", {
    body: JSON.stringify({ email, password }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readApiErrorMessage(payload, response.status));
  }

  const candidate = unwrapApiPayload(payload);
  if (!isLoginResponse(candidate)) {
    throw new Error("Phản hồi đăng nhập từ backend không đúng định dạng.");
  }

  return {
    accessToken: candidate.accessToken,
    staff: mapStaff(candidate.staff),
  };
}

export async function getCurrentStaff(): Promise<StaffRecord | undefined> {
  const response = await fetch("/api/auth/me", {
    cache: "no-store",
    method: "GET",
  });

  if (response.status === 401) {
    return undefined;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readApiErrorMessage(payload, response.status));
  }

  const candidate = unwrapApiPayload(payload);
  if (!isAuthMeResponse(candidate)) {
    throw new Error("Phản hồi xác thực từ backend không đúng định dạng.");
  }

  return mapStaff(candidate.staff);
}

function isLoginResponse(payload: unknown): payload is LoginResponse {
  if (!payload || typeof payload !== "object") return false;
  const value = payload as Partial<LoginResponse>;
  return (
    typeof value.accessToken === "string" &&
    Boolean(value.staff) &&
    typeof value.staff?.email === "string" &&
    typeof value.staff.fullName === "string" &&
    typeof value.staff.id === "number" &&
    typeof value.staff.leaveCredit === "number" &&
    typeof value.staff.role === "string"
  );
}

function isAuthMeResponse(payload: unknown): payload is AuthMeResponse {
  if (!payload || typeof payload !== "object") return false;
  const value = payload as Partial<AuthMeResponse>;
  return (
    Boolean(value.staff) &&
    typeof value.staff?.email === "string" &&
    typeof value.staff.fullName === "string" &&
    typeof value.staff.id === "number" &&
    typeof value.staff.leaveCredit === "number" &&
    typeof value.staff.role === "string"
  );
}

function mapStaff(staff: LoginResponse["staff"]): StaffRecord {
  const now = new Date().toISOString();
  return {
    createdAt: now,
    updatedAt: now,
    email: staff.email,
    fullName: staff.fullName,
    id: staff.id,
    leaveCredit: staff.leaveCredit,
    roleId: mapRoleNameToId(staff.role),
    departmentId: staff.departmentId ?? null,
    department: staff.department ?? null,
  };
}


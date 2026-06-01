import type { DepartmentRecord } from "@/types/leave-app";
import { readApiErrorMessage, readSuccessResponse } from "./api-response";
import { readAccessToken } from "./session";

type DepartmentApiDto = {
  id: number;
  name: string;
  description?: string | null;
};

export async function fetchDepartments(): Promise<DepartmentRecord[]> {
  const token = readAccessToken();
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch("/api/departments", { method: "GET", headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readApiErrorMessage(payload, response.status));
  }

  const { data } = readSuccessResponse<DepartmentApiDto[]>(payload);
  return data.map((department) => ({
    id: department.id,
    name: department.name,
    description: department.description ?? null,
  }));
}

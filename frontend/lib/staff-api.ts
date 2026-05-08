import type { RoleRecord, StaffRecord } from "@/types/leave-app";
import { readApiErrorMessage, readSuccessResponse, unwrapApiResponse } from "./api-response";
import { mapStaffFromApi } from "./leave-app-mappers";
import { readAccessToken } from "./session";

type CreateStaffInput = {
  fullName: string;
  email: string;
  password: string;
  smtpPass: string;
  roleId?: number;
  leaveCredit?: number;
};

type StaffApiDto = {
  id: number;
  fullName: string;
  email: string;
  role: string;
  leaveCredit: number;
  createdAt: string;
};

type RoleApiDto = {
  id: number;
  name: string;
};

type PaginationMeta = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export async function fetchStaffsPage(params: {
  page: number;
  limit: number;
}): Promise<{ staffs: StaffRecord[]; meta?: PaginationMeta }> {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  }).toString();

  const response = await authorizedFetch(`/api/staffs?${query}`, { method: "GET" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readApiErrorMessage(payload, response.status));
  }

  const { data, meta } = readSuccessResponse<StaffApiDto[], PaginationMeta>(payload);
  return { staffs: data.map(mapStaffFromApi), meta };
}

export async function fetchAllStaffs(params?: {
  pageSize?: number;
  maxPages?: number;
}): Promise<StaffRecord[]> {
  const pageSize = params?.pageSize ?? 100;
  const maxPages = params?.maxPages ?? 50;

  let page = 1;
  const result: StaffRecord[] = [];

  while (page <= maxPages) {
    const { staffs, meta } = await fetchStaffsPage({ page, limit: pageSize });
    result.push(...staffs);

    if (!meta?.hasNextPage) {
      break;
    }
    page += 1;
  }

  return result;
}

export async function fetchStaffById(id: number): Promise<StaffRecord> {
  const response = await authorizedFetch(`/api/staffs/${id}`, { method: "GET" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readApiErrorMessage(payload, response.status));
  }

  return mapStaffFromApi(unwrapApiResponse<StaffApiDto>(payload));
}

export async function createStaff(input: CreateStaffInput): Promise<StaffRecord> {
  const response = await authorizedFetch("/api/staffs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readApiErrorMessage(payload, response.status));
  }

  return mapStaffFromApi(unwrapApiResponse<StaffApiDto>(payload));
}

export async function fetchRoles(): Promise<RoleRecord[]> {
  const response = await authorizedFetch("/api/staffs/roles", { method: "GET" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readApiErrorMessage(payload, response.status));
  }

  const { data } = readSuccessResponse<RoleApiDto[]>(payload);
  return data.map((role) => ({ id: role.id, name: role.name as RoleRecord["name"] }));
}

export async function deleteStaff(id: number): Promise<void> {
  const response = await authorizedFetch(`/api/staffs/${id}`, { method: "DELETE" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readApiErrorMessage(payload, response.status));
  }
}

async function authorizedFetch(url: string, init: RequestInit): Promise<Response> {
  const token = readAccessToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, { ...init, headers });
}

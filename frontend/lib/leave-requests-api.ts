import type { LeaveRequestRecord, LeaveSession } from "@/types/leave-app";
import { readApiErrorMessage, readSuccessResponse, unwrapApiResponse } from "./api-response";
import { mapLeaveRequestFromApi } from "./leave-app-mappers";
import { readAccessToken } from "./session";

type LeaveRequestApiDto = {
  id: number;
  staffId: number;
  leaveDate: string;
  type?: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  rejectReason?: string;
  resolvedByStaffId?: number;
  processedAt?: string;
  createdAt: string;
};

type CreateLeaveRequestResponse = {
  requests: LeaveRequestApiDto[];
  totalDays: number;
};

export type LeaveRequestStatusFilter = "pending" | "approved" | "rejected";

export type LeaveRequestPaginationMeta = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type FetchLeaveRequestsPageParams = {
  page: number;
  limit: number;
  status?: LeaveRequestStatusFilter;
  staffId?: number;
};

export async function fetchLeaveRequestsPage(
  params: FetchLeaveRequestsPageParams,
): Promise<{ requests: LeaveRequestRecord[]; meta?: LeaveRequestPaginationMeta }> {
  const search = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
  });
  if (params.status) {
    search.set("status", params.status);
  }
  if (typeof params.staffId === "number") {
    search.set("staffId", String(params.staffId));
  }

  const response = await authorizedFetch(`/api/leave-requests?${search.toString()}`, {
    method: "GET",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readApiErrorMessage(payload, response.status));
  }

  const { data, meta } = readSuccessResponse<LeaveRequestApiDto[], LeaveRequestPaginationMeta>(
    payload,
  );
  return { requests: data.map(mapLeaveRequestFromApi), meta };
}

export async function fetchAllLeaveRequests(
  params?: { staffId?: number; pageSize?: number; maxPages?: number },
): Promise<LeaveRequestRecord[]> {
  const pageSize = params?.pageSize ?? 100;
  const maxPages = params?.maxPages ?? 50;

  let page = 1;
  const result: LeaveRequestRecord[] = [];

  while (page <= maxPages) {
    const { requests, meta } = await fetchLeaveRequestsPage({
      page,
      limit: pageSize,
      staffId: params?.staffId,
    });
    result.push(...requests);

    if (!meta?.hasNextPage) {
      break;
    }
    page += 1;
  }

  return result;
}

export async function approveLeaveRequest(id: number, note?: string): Promise<LeaveRequestRecord> {
  const response = await authorizedFetch(`/api/leave-requests/${id}/approve`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note ? { note } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readApiErrorMessage(payload, response.status));
  }

  return mapLeaveRequestFromApi(unwrapApiResponse<LeaveRequestApiDto>(payload));
}

export async function rejectLeaveRequest(id: number, note: string): Promise<LeaveRequestRecord> {
  const response = await authorizedFetch(`/api/leave-requests/${id}/reject`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readApiErrorMessage(payload, response.status));
  }

  return mapLeaveRequestFromApi(unwrapApiResponse<LeaveRequestApiDto>(payload));
}

export async function createLeaveRequest(input: {
  staffId: number;
  leaveDate: string;
  type_leave: LeaveSession;
  reason: string;
}): Promise<LeaveRequestRecord[]> {
  const response = await authorizedFetch("/api/leave-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      staffId: input.staffId,
      leaveDate: input.leaveDate,
      type: input.type_leave,
      reason: input.reason,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(readApiErrorMessage(payload, response.status));
  }

  const data = unwrapApiResponse<CreateLeaveRequestResponse>(payload);
  return data.requests.map(mapLeaveRequestFromApi);
}

async function authorizedFetch(url: string, init: RequestInit): Promise<Response> {
  const token = readAccessToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(url, { ...init, headers });
}

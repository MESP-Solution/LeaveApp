"use client";
import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/current-user-context";
import { formatDate, formatDateTime, leaveStatusLabel } from "@/lib/formatters";
import {
  approveLeaveRequest,
  createLeaveRequest,
  fetchAllLeaveRequests,
  fetchLeaveRequestsPage,
  rejectLeaveRequest,
  type LeaveRequestPaginationMeta,
} from "@/lib/leave-requests-api";
import { findRoleName } from "@/lib/leave-app-helpers";
import { leaveSessionLabel } from "@/lib/leave-session";
import {
  createStaff,
  deleteStaff,
  fetchAllStaffs,
  fetchRoles,
  fetchStaffsPage,
} from "@/lib/staff-api";
import type { LeaveRequestRecord, LeaveSession, RoleRecord, StaffRecord } from "@/types/leave-app";
import { AdminWorkspace } from "./admin-workspace";
import { LoginScreen } from "./login-screen";
import { Metrics } from "./metrics";
import { StaffWorkspace } from "./staff-workspace";
import { useToast } from "./toast";

const requestsPageSize = 10;

export function LeaveDashboard() {
  const [requests, setRequests] = useState<LeaveRequestRecord[]>([]);
  const [requestsPage, setRequestsPage] = useState<LeaveRequestRecord[]>([]);
  const [requestsPageMeta, setRequestsPageMeta] = useState<LeaveRequestPaginationMeta>();
  const [staffs, setStaffs] = useState<StaffRecord[]>([]);
  const [adminStaffs, setAdminStaffs] = useState<StaffRecord[]>([]);
  const [adminStaffMeta, setAdminStaffMeta] = useState<{
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }>();
  const [adminStaffPage, setAdminStaffPage] = useState(1);
  const adminStaffPageSize = 10;
  const { currentUser, setCurrentUser, isRestoringSession, restoreError } = useCurrentUser();
  const toast = useToast();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number>();
  const [rejectNote, setRejectNote] = useState("");
  const [isProcessingRequest, setIsProcessingRequest] = useState(false);

  const currentRole = currentUser ? findRoleName(currentUser) : undefined;
  const selectedRequest = requests.find((request) => request.id === selectedRequestId);
  const canProcessFromModal =
    currentRole === "ADMIN" || currentRole === "HEAD";

  // Surface session-restore failures as a toast (only fires when restoreError changes).
  useEffect(() => {
    if (restoreError) {
      toast.error(restoreError);
    }
  }, [restoreError, toast]);

  const reloadData = useCallback(
    async (staff: StaffRecord) => {
      setIsLoadingData(true);
      try {
        const isStaff = findRoleName(staff) === "STAFF";
        const staffId = isStaff ? staff.id : undefined;
        const [staffData, leaveData, paged] = await Promise.all([
          fetchAllStaffs({ pageSize: 100 }),
          fetchAllLeaveRequests({ staffId }),
          fetchLeaveRequestsPage({ page: 1, limit: requestsPageSize, staffId }),
        ]);
        setStaffs(staffData);
        setRequests(leaveData);
        setRequestsPage(paged.requests);
        setRequestsPageMeta(paged.meta);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Không tải được dữ liệu từ máy chủ.",
        );
      } finally {
        setIsLoadingData(false);
      }
    },
    [toast],
  );

  const reloadRequestsPage = useCallback(
    async (nextPage: number) => {
      if (!currentUser) return;
      const isStaff = findRoleName(currentUser) === "STAFF";
      const staffId = isStaff ? currentUser.id : undefined;
      try {
        const { requests: pageRequests, meta } = await fetchLeaveRequestsPage({
          page: nextPage,
          limit: requestsPageSize,
          staffId,
        });
        setRequestsPage(pageRequests);
        setRequestsPageMeta(meta);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Không tải được danh sách đơn.",
        );
      }
    },
    [currentUser, toast],
  );

  const reloadAdminStaffPage = useCallback(
    async (page: number) => {
      const { staffs: pageStaffs, meta } = await fetchStaffsPage({
        page,
        limit: adminStaffPageSize,
      });
      setAdminStaffs(pageStaffs);
      setAdminStaffMeta(meta);
      setAdminStaffPage(page);
    },
    [adminStaffPageSize],
  );

  // Load workspace data whenever a user becomes available (initial restore or after login).
  useEffect(() => {
    if (!currentUser) return;
    let isActive = true;

    void (async () => {
      try {
        await reloadData(currentUser);
        if (findRoleName(currentUser) !== "STAFF") {
          const [loadedRoles] = await Promise.all([fetchRoles(), reloadAdminStaffPage(1)]);
          if (isActive) {
            setRoles(loadedRoles);
          }
        }
      } catch (error) {
        if (isActive) {
          toast.error(
            error instanceof Error ? error.message : "Không tải được dữ liệu nhân sự.",
          );
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [currentUser, reloadAdminStaffPage, reloadData, toast]);

  if (isRestoringSession) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-600">
        Đang khôi phục phiên đăng nhập...
      </div>
    );
  }

  if (!currentUser || !currentRole) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  async function handleSubmit(
    staffId: number,
    leaveDate: string,
    type_leave: LeaveSession,
    reason: string,
  ) {
    const createdRequests = await createLeaveRequest({ staffId, leaveDate, type_leave, reason });
    if (currentUser) {
      await reloadData(currentUser);
      mergeCreatedRequests(createdRequests);
    }
  }

  async function handleCreateStaff(input: {
    fullName: string;
    email: string;
    password: string;
    smtpPass: string;
    roleId?: number;
    leaveCredit?: number;
  }) {
    const created = await createStaff(input);
    setStaffs((current) => [created, ...current]);
    if (currentRole !== "STAFF") {
      await reloadAdminStaffPage(adminStaffPage);
    }
  }

  async function handleDeleteStaff(staffId: number) {
    await deleteStaff(staffId);
    setStaffs((current) => current.filter((staff) => staff.id !== staffId));
    if (currentRole !== "STAFF") {
      await reloadAdminStaffPage(adminStaffPage);
    }
  }

  return (
    <div className="grid gap-6">
      {currentRole !== "STAFF" ? <Metrics requests={requests} staffs={staffs} /> : null}
      {isLoadingData ? <p className="text-sm text-slate-600">Đang tải dữ liệu từ máy chủ...</p> : null}

      {currentRole === "STAFF" ? (
        <StaffWorkspace
          onRequestsPageChange={reloadRequestsPage}
          onSubmit={handleSubmit}
          onViewRequest={openRequestDetail}
          requests={requests}
          requestsMeta={requestsPageMeta}
          requestsPage={requestsPage}
          staff={currentUser}
          staffs={staffs}
        />
      ) : null}
      {currentRole !== "STAFF" ? (
        <AdminWorkspace
          currentRole={currentRole}
          onCreateStaff={handleCreateStaff}
          onDeleteStaff={handleDeleteStaff}
          onPageChange={(nextPage) => reloadAdminStaffPage(nextPage)}
          onRequestsPageChange={reloadRequestsPage}
          onViewRequest={openRequestDetail}
          roles={roles}
          staffMeta={adminStaffMeta}
          requests={requests}
          requestsMeta={requestsPageMeta}
          requestsPage={requestsPage}
          staffs={staffs}
          staffsPage={adminStaffs}
        />
      ) : null}

      {selectedRequest ? (
        <div className={modalOverlayClassName} role="dialog" aria-modal="true">
          <div className={modalCardClassName}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Chi tiết đơn nghỉ phép</h3>
                <p className="mt-1 text-sm text-slate-600">Đơn #{selectedRequest.id}</p>
              </div>
              <button
                className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700"
                onClick={closeRequestDetail}
                type="button"
              >
                Đóng
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="grid gap-2 text-sm">
                <DetailRow label="Nhân viên" value={findStaffNameById(staffs, selectedRequest.staffId)} />
                <DetailRow label="Ngày nghỉ" value={formatDate(selectedRequest.leaveDate)} />
                <DetailRow label="Buổi nghỉ" value={leaveSessionLabel(selectedRequest.type_leave)} />
                <DetailRow label="Lý do" value={selectedRequest.reason} />
                <DetailRow label="Trạng thái" value={leaveStatusLabel(selectedRequest.status)} />
                <DetailRow label="Xử lý bởi" value={findStaffNameById(staffs, selectedRequest.resolvedBy)} />
                <DetailRow label="Thời gian xử lý" value={formatDateTime(selectedRequest.resolvedAt)} />
                {selectedRequest.rejectReason ? (
                  <DetailRow label="Lý do từ chối" value={selectedRequest.rejectReason} />
                ) : null}
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">Duyệt / từ chối đơn</p>
                {canProcessFromModal ? (
                  <>
                    <p className="mt-1 text-sm text-slate-600">
                      Nhập lý do khi từ chối (bắt buộc).
                    </p>
                    <textarea
                      className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
                      onChange={(event) => setRejectNote(event.target.value)}
                      placeholder="Nhập lý do khi từ chối"
                      rows={6}
                      value={rejectNote}
                    />
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:bg-emerald-300"
                        disabled={isProcessingRequest || selectedRequest.status !== "PENDING"}
                        onClick={() => void processRequestFromModal("approve")}
                        type="button"
                      >
                        Duyệt
                      </button>
                      <button
                        className="rounded-md border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 disabled:bg-slate-100"
                        disabled={
                          isProcessingRequest ||
                          selectedRequest.status !== "PENDING" ||
                          !rejectNote.trim()
                        }
                        onClick={() => void processRequestFromModal("reject")}
                        type="button"
                      >
                        Từ chối
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">
                    Bạn không có quyền xử lý đơn này.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  function handleLogin(staff: StaffRecord) {
    // Data load is handled by the effect that watches currentUser.
    setCurrentUser(staff);
  }

  function updateRequest(nextRequest: LeaveRequestRecord) {
    setRequests((current) =>
      current.map((request) => (request.id === nextRequest.id ? { ...request, ...nextRequest } : request)),
    );
    setRequestsPage((current) =>
      current.map((request) => (request.id === nextRequest.id ? { ...request, ...nextRequest } : request)),
    );
  }

  function mergeCreatedRequests(createdRequests: LeaveRequestRecord[]) {
    setRequests((current) => mergeRequestsById(current, createdRequests));
    setRequestsPage((current) => mergeRequestsById(current, createdRequests));
  }

  function openRequestDetail(request: LeaveRequestRecord) {
    setSelectedRequestId(request.id);
    setRejectNote("");
  }

  function closeRequestDetail() {
    setSelectedRequestId(undefined);
    setRejectNote("");
  }

  async function processRequestFromModal(action: "approve" | "reject") {
    if (!selectedRequest) {
      return;
    }

    setIsProcessingRequest(true);
    try {
      if (action === "approve") {
        const updated = await approveLeaveRequest(selectedRequest.id);
        updateRequest(updated);
        toast.success("Đã duyệt đơn nghỉ.");
      } else {
        const updated = await rejectLeaveRequest(selectedRequest.id, rejectNote.trim());
        updateRequest(updated);
        toast.success("Đã từ chối đơn nghỉ.");
      }
      setRejectNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không xử lý được đơn nghỉ.");
    } finally {
      setIsProcessingRequest(false);
    }
  }
}

function findStaffNameById(staffs: StaffRecord[], staffId?: number): string {
  if (!staffId) return "-";
  return staffs.find((staff) => staff.id === staffId)?.fullName ?? "-";
}

function mergeRequestsById(
  requests: LeaveRequestRecord[],
  nextRequests: LeaveRequestRecord[],
): LeaveRequestRecord[] {
  if (nextRequests.length === 0) {
    return requests;
  }

  return requests.map((request) => {
    const nextRequest = nextRequests.find((item) => item.id === request.id);
    return nextRequest ? { ...request, ...nextRequest } : request;
  });
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-slate-500">{label}</p>
      <p className="font-medium text-slate-950">{value || "-"}</p>
    </div>
  );
}

const modalOverlayClassName =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4";
const modalCardClassName =
  "w-full max-w-4xl rounded-md border border-slate-200 bg-white p-5 shadow-xl";

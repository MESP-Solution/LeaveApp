interface WrappedApiResponse<T> {
  data?: T;
  message?: string | string[];
}

type SuccessWrapper<T, M = unknown> = {
  success?: boolean;
  statusCode?: number;
  message?: string | string[];
  timestamp?: string;
  path?: string;
  data?: T;
  meta?: M;
};

export function unwrapApiResponse<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    const data = (payload as WrappedApiResponse<T>).data;
    return (data ?? payload) as T;
  }

  return payload as T;
}

export function readSuccessResponse<T, M = unknown>(payload: unknown): { data: T; meta?: M } {
  if (payload && typeof payload === "object" && "data" in payload) {
    const wrapped = payload as SuccessWrapper<T, M>;
    return { data: (wrapped.data ?? payload) as T, meta: wrapped.meta };
  }

  return { data: payload as T };
}

export function readApiErrorMessage(payload: unknown, status: number): string {
  const candidate = unwrapApiResponse<WrappedApiResponse<unknown>>(payload);

  if (status === 401) {
    return "Phiên đăng nhập hết hạn hoặc không hợp lệ.";
  }
  if (status === 403) {
    return "Bạn không có quyền thực hiện thao tác này.";
  }
  if (status === 404) {
    return "Không tìm thấy dữ liệu yêu cầu.";
  }
  if (status === 409) {
    return "Dữ liệu xung đột với trạng thái hiện tại.";
  }
  if (status === 503) {
    return "Không kết nối được máy chủ.";
  }

  if (candidate && typeof candidate === "object" && "message" in candidate) {
    const message = candidate.message;
    return Array.isArray(message) ? message.join(", ") : String(message);
  }

  return "Yêu cầu thất bại. Vui lòng thử lại.";
}

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

const ERROR_TRANSLATIONS: Record<string, string> = {
  "Cannot delete your own account": "Bạn không thể tự xóa tài khoản của chính mình.",
  "Cannot delete an ADMIN account": "Không thể xóa tài khoản của Quản trị viên (ADMIN).",
  "Cannot delete staff who created other staff records": "Không thể xóa nhân viên này vì họ đã khởi tạo các tài khoản khác.",
  "Cannot delete staff who has leave requests": "Không thể xóa nhân viên đã có lịch sử nộp đơn xin nghỉ phép.",
  "Cannot delete staff who has processed leave requests": "Không thể xóa nhân viên đã từng tham gia duyệt hoặc từ chối đơn.",
  "Department already has a MANAGER": "Phòng ban này đã có người quản lý (MANAGER).",
  "Email already exists": "Địa chỉ Email này đã được sử dụng.",
  "Only one ADMIN is allowed": "Hệ thống chỉ cho phép tồn tại duy nhất một tài khoản ADMIN.",
  "Not allowed to create this role": "Bạn không có quyền tạo tài khoản với vai trò này.",
  "No department assigned to your account": "Tài khoản của bạn chưa được gán vào phòng ban nào.",
  "Department is required for this role": "Vai trò này bắt buộc phải chọn phòng ban.",
  "Invalid email or password": "Email hoặc mật khẩu không chính xác.",
  "Current password is incorrect": "Mật khẩu hiện tại không chính xác.",
  "Invalid or expired OTP": "Mã OTP không đúng hoặc đã hết hạn.",
  "Too many attempts": "Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã OTP mới.",
  "Password changed successfully": "Đổi mật khẩu thành công.",
  "You can only view staff from your own department": "Bạn chỉ có thể xem nhân sự thuộc phòng ban của mình.",
};

export function readApiErrorMessage(payload: unknown, status: number): string {
  const candidate = unwrapApiResponse<WrappedApiResponse<unknown>>(payload);
  let apiMessage = "";

  if (candidate && typeof candidate === "object" && "message" in candidate) {
    const message = candidate.message;
    apiMessage = Array.isArray(message) ? message.join(", ") : String(message);
  }

  if (apiMessage && ERROR_TRANSLATIONS[apiMessage]) {
    return ERROR_TRANSLATIONS[apiMessage];
  }

  if (status === 401) {
    return "Phiên đăng nhập hết hạn hoặc không hợp lệ.";
  }
  if (status === 403) {
    return apiMessage || "Bạn không có quyền thực hiện thao tác này.";
  }
  if (status === 404) {
    return apiMessage || "Không tìm thấy dữ liệu yêu cầu.";
  }
  if (status === 409) {
    return apiMessage || "Dữ liệu xung đột với trạng thái hiện tại.";
  }
  if (status === 503) {
    return "Không kết nối được máy chủ.";
  }

  return apiMessage || "Yêu cầu thất bại. Vui lòng thử lại.";
}

import { TypeLeave } from '../database/enums/type-leave.enum';

const TYPE_LABELS: Record<string, string> = {
  [TypeLeave.FULL]: 'Cả ngày',
  [TypeLeave.MORNING]: 'Buổi sáng',
  [TypeLeave.AFTERNOON]: 'Buổi chiều',
};

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateStr;
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

function wrapLayout(headerBg: string, headerText: string, body: string): string {
  return `
<div style="font-family:Arial,sans-serif;background:#f1f5f9;padding:24px">
  <div style="max-width:560px;margin:auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
    <div style="background:${headerBg};color:#fff;padding:18px 24px">
      <h1 style="margin:0;font-size:18px;font-weight:600">${headerText}</h1>
    </div>
    <div style="padding:24px">${body}</div>
    <div style="padding:0 24px 20px;font-size:12px;color:#9ca3af">
      Email tự động từ hệ thống quản lý nghỉ phép.
    </div>
  </div>
</div>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;color:#64748b;font-size:14px;white-space:nowrap">${label}</td>
    <td style="padding:8px 12px;color:#1e293b;font-size:14px;font-weight:500">${value}</td>
  </tr>`;
}

function infoTable(rows: string): string {
  return `<table style="width:100%;border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:16px 0">${rows}</table>`;
}

export function approverNotificationHtml(data: {
  staffName: string;
  leaveDate: string;
  type: string;
  reason: string;
}): string {
  const body = `
    <p style="font-size:15px;color:#334155;margin:0 0 4px">Có đơn nghỉ phép mới cần duyệt.</p>
    ${infoTable(
      infoRow('Nhân viên', data.staffName) +
      infoRow('Ngày nghỉ', formatDate(data.leaveDate)) +
      infoRow('Loại', typeLabel(data.type)) +
      infoRow('Lý do', data.reason),
    )}
    <p style="font-size:13px;color:#94a3b8;margin:16px 0 0">Vui lòng xem xét và xử lý trên hệ thống.</p>`;
  return wrapLayout('#334155', 'Đơn Nghỉ Phép Chờ Duyệt', body);
}

export function otpPasswordResetHtml(data: {
  fullName: string;
  otp: string;
  expiresInMinutes: number;
}): string {
  const body = `
    <p style="font-size:15px;color:#334155;margin:0 0 4px">Xin chào ${data.fullName},</p>
    <p style="font-size:14px;color:#64748b;margin:0 0 4px">Bạn vừa yêu cầu đặt lại mật khẩu. Dùng mã OTP bên dưới để tiếp tục.</p>
    <div style="text-align:center;margin:20px 0">
      <span style="display:inline-block;font-size:30px;font-weight:700;letter-spacing:8px;color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 24px">${data.otp}</span>
    </div>
    <p style="font-size:13px;color:#94a3b8;margin:8px 0 0">Mã có hiệu lực trong ${data.expiresInMinutes} phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`;
  return wrapLayout('#1d4ed8', 'Đặt Lại Mật Khẩu', body);
}

export function outcomeNotificationHtml(data: {
  staffName: string;
  leaveDate: string;
  type: string;
  approved: boolean;
  resolverName: string;
  rejectReason?: string;
}): string {
  const statusText = data.approved ? 'ĐÃ DUYỆT' : 'TỪ CHỐI';
  const statusColor = data.approved ? '#16a34a' : '#dc2626';
  const headerBg = data.approved ? '#16a34a' : '#dc2626';

  let rows =
    infoRow('Nhân viên', data.staffName) +
    infoRow('Ngày nghỉ', formatDate(data.leaveDate)) +
    infoRow('Loại', typeLabel(data.type)) +
    infoRow('Người xử lý', data.resolverName) +
    infoRow('Kết quả', `<span style="color:${statusColor};font-weight:700">${statusText}</span>`);

  if (!data.approved && data.rejectReason) {
    rows += infoRow('Lý do từ chối', data.rejectReason);
  }

  const body = `
    <p style="font-size:15px;color:#334155;margin:0 0 4px">Đơn nghỉ phép của bạn đã được xử lý.</p>
    ${infoTable(rows)}`;

  return wrapLayout(headerBg, `Đơn Nghỉ Phép ${statusText}`, body);
}

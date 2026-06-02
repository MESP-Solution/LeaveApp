import type { LeaveRequestRecord, StaffRecord } from "@/types/leave-app";

export function Metrics({
  requests,
  staffs,
}: {
  requests: LeaveRequestRecord[];
  staffs: StaffRecord[];
}) {
  const metrics = [
    { label: "Nhân sự", value: staffs.length },
    {
      label: "Chờ duyệt",
      value: requests.filter((request) => request.status === "PENDING").length,
    },
    {
      label: "Đã duyệt",
      value: requests.filter((request) => request.status === "APPROVED").length,
    },
    {
      label: "Từ chối",
      value: requests.filter((request) => request.status === "REJECTED").length,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div className="rounded-md border border-slate-200 bg-white p-4" key={metric.label}>
          <p className="text-sm text-slate-500">{metric.label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{metric.value}</p>
        </div>
      ))}
    </div>
  );
}

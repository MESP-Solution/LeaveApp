import type { LeaveSession } from "@/types/leave-app";

export const leaveSessionOptions: { label: string; value: LeaveSession; creditCost: number }[] = [
  { label: "Buổi sáng", value: "MORNING", creditCost: 0.5 },
  { label: "Buổi chiều", value: "AFTERNOON", creditCost: 0.5 },
  { label: "Cả ngày", value: "FULL", creditCost: 1 },
];

export function leaveSessionLabel(value?: LeaveSession): string {
  return leaveSessionOptions.find((option) => option.value === value)?.label ?? "Cả ngày";
}

export function leaveSessionCreditCost(value?: LeaveSession): number {
  return leaveSessionOptions.find((option) => option.value === value)?.creditCost ?? 1;
}

export function normalizeLeaveSession(value: unknown): LeaveSession {
  if (value === "MORNING" || value === "morning") {
    return "MORNING";
  }

  if (value === "AFTERNOON" || value === "afternoon") {
    return "AFTERNOON";
  }

  return "FULL";
}

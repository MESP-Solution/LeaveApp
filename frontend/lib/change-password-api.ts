import { readApiErrorMessage } from "./api-response";
import { readAccessToken } from "./session";

/** Change the logged-in user's password (verified by their current password). */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const token = readAccessToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }

  const response = await fetch("/api/auth/change-password", {
    method: "POST",
    headers,
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  await throwIfNotOk(response);
}

/** Request an OTP for the forgot-password flow (public). */
export async function requestResetOtp(email: string): Promise<void> {
  const response = await fetch("/api/auth/forgot-password/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  await throwIfNotOk(response);
}

/** Verify an OTP without consuming it (public). */
export async function verifyResetOtp(email: string, otp: string): Promise<void> {
  const response = await fetch("/api/auth/forgot-password/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });

  await throwIfNotOk(response);
}

/** Reset the password using a valid OTP (public). */
export async function resetPassword(
  email: string,
  otp: string,
  newPassword: string,
): Promise<void> {
  const response = await fetch("/api/auth/forgot-password/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp, newPassword }),
  });

  await throwIfNotOk(response);
}

async function throwIfNotOk(response: Response): Promise<void> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(readApiErrorMessage(payload, response.status));
  }
}

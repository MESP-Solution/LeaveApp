import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const backendUrl =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000";
const backendApiBase = `${backendUrl}/api`;

interface WrappedApiResponse<T> {
  data?: T;
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
  }

  try {
    const backendResponse = await fetch(`${backendApiBase}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      method: "GET",
    });

    const backendPayload = await backendResponse.json().catch(() => ({}));

    if (!backendResponse.ok) {
      const response = NextResponse.json(backendPayload, {
        status: backendResponse.status,
      });

      response.cookies.delete("access_token");
      response.cookies.delete("leave_app_access_token");

      return response;
    }

    return NextResponse.json({ staff: unwrapApiResponse(backendPayload) });
  } catch {
    return NextResponse.json(
      { message: "Không kết nối được máy chủ xác thực." },
      { status: 503 },
    );
  }
}

function unwrapApiResponse<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as WrappedApiResponse<T>).data
  ) {
    return (payload as WrappedApiResponse<T>).data as T;
  }

  return payload as T;
}

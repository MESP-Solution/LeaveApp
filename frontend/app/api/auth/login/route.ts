import { NextResponse } from "next/server";

const backendUrl =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000";
const backendApiBase = `${backendUrl}/api`;

interface AuthPayload {
  accessToken?: string;
  staff?: unknown;
}

interface WrappedApiResponse<T> {
  data?: T;
}

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const backendResponse = await fetch(`${backendApiBase}/auth/login`, {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const backendPayload = await backendResponse.json().catch(() => ({}));

    if (!backendResponse.ok) {
      return NextResponse.json(backendPayload, { status: backendResponse.status });
    }

    const authPayload = unwrapApiResponse<AuthPayload>(backendPayload);

    if (!authPayload.accessToken || !authPayload.staff) {
      return NextResponse.json(
        { message: "Backend login response is invalid." },
        { status: 502 },
      );
    }

    const response = NextResponse.json({
      accessToken: authPayload.accessToken,
      staff: authPayload.staff,
    });

    response.cookies.set("access_token", authPayload.accessToken, {
      httpOnly: true,
      maxAge: 60 * 60 * 24,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    response.cookies.set("leave_app_access_token", authPayload.accessToken, {
      httpOnly: false,
      maxAge: 60 * 60 * 24,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch {
    return NextResponse.json(
      { message: "Không kết nối được máy chủ đăng nhập." },
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

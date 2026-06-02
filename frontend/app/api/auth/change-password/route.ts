import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const backendUrl =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000";
const backendApiBase = `${backendUrl}/api`;

export async function POST(request: Request) {
  const incomingAuth = request.headers.get("authorization");
  const cookieStore = await cookies();
  const token = incomingAuth?.replace(/^Bearer\s+/i, "") ?? cookieStore.get("access_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
  }

  const body = await request.json();

  try {
    const backendResponse = await fetch(`${backendApiBase}/auth/change-password`, {
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      method: "POST",
    });

    const backendPayload = await backendResponse.json().catch(() => ({}));
    return NextResponse.json(backendPayload, { status: backendResponse.status });
  } catch {
    return NextResponse.json(
      { message: "Không kết nối được máy chủ." },
      { status: 503 },
    );
  }
}

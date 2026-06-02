import { NextResponse } from "next/server";

const backendUrl =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000";
const backendApiBase = `${backendUrl}/api`;

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const backendResponse = await fetch(`${backendApiBase}/auth/forgot-password/verify`, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
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

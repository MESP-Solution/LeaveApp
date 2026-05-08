import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const backendUrl =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000";
const backendApiBase = `${backendUrl}/api`;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.search ? url.search : "";
  const backendEndpoint = `${backendApiBase}/leave-requests${query}`;

  try {
    const headers = await buildHeaders(request);
    const response = await fetch(backendEndpoint, {
      method: "GET",
      headers,
    });
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Không kết nối được máy chủ." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const headers = await buildHeaders(request);
    const response = await fetch(`${backendApiBase}/leave-requests`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ message: "Không kết nối được máy chủ." }, { status: 503 });
  }
}

async function buildHeaders(request: Request): Promise<HeadersInit> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const authHeader = request.headers.get("authorization");
  if (authHeader?.trim()) {
    headers.Authorization = authHeader;
    return headers;
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("access_token")?.value;
  if (cookieToken) {
    headers.Authorization = `Bearer ${cookieToken}`;
  }

  return headers;
}

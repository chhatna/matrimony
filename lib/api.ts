import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "./auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function requireSession(): SessionPayload {
  const s = getSession();
  if (!s) throw new ApiError("Not authenticated", 401);
  return s;
}

export async function handle<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError) return fail(e.message, e.status);
    // eslint-disable-next-line no-console
    console.error("[api] unexpected error", e);
    return fail("Internal server error", 500);
  }
}

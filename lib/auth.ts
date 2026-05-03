import jwt from "jsonwebtoken";
import { cookies, headers } from "next/headers";
import { NextRequest } from "next/server";

const COOKIE_NAME = "mt_token";
const TOKEN_TTL = "30d";

function getSecret(): string {
  return process.env.JWT_SECRET || "";
}

export type SessionPayload = {
  uid: string;
  email: string;
  role: "user" | "admin";
};

export function signToken(payload: SessionPayload): string {
  const secret = getSecret();
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return jwt.sign(payload, secret, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): SessionPayload | null {
  const secret = getSecret();
  if (!secret) return null;
  try {
    return jwt.verify(token, secret) as SessionPayload;
  } catch {
    return null;
  }
}

function extractBearerToken(): string | null {
  try {
    const h = headers();
    const auth = h.get("authorization") || h.get("Authorization");
    if (!auth) return null;
    const m = auth.match(/^Bearer\s+(.+)$/i);
    return m?.[1]?.trim() || null;
  } catch {
    // headers() throws in contexts where it's not available; fall through.
    return null;
  }
}

/**
 * Read session from server-component / route-handler context.
 * Accepts the token either in the `mt_token` cookie (web) or the
 * `Authorization: Bearer <token>` header (mobile / API clients).
 */
export function getSession(): SessionPayload | null {
  const cookieToken = cookies().get(COOKIE_NAME)?.value;
  const token = cookieToken || extractBearerToken();
  if (!token) return null;
  return verifyToken(token);
}

/** Read session from a NextRequest (for middleware or edge handlers). */
export function getSessionFromRequest(req: NextRequest): SessionPayload | null {
  const cookieToken = req.cookies.get(COOKIE_NAME)?.value;
  if (cookieToken) {
    const s = verifyToken(cookieToken);
    if (s) return s;
  }
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (auth) {
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const bearer = m?.[1]?.trim();
    if (bearer) return verifyToken(bearer);
  }
  return null;
}

export const AUTH_COOKIE = COOKIE_NAME;

export function authCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 30) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

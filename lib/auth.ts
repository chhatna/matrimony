import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
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

/** Read session from server-component / route-handler cookies. */
export function getSession(): SessionPayload | null {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Read session from a NextRequest (for middleware or edge handlers). */
export function getSessionFromRequest(req: NextRequest): SessionPayload | null {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
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

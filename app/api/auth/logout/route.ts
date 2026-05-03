import { AUTH_COOKIE } from "@/lib/auth";
import { ok } from "@/lib/api";

export async function POST() {
  const res = ok({ loggedOut: true });
  res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

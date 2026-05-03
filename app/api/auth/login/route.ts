import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { signToken, AUTH_COOKIE, authCookieOptions } from "@/lib/auth";
import { fail, handle, ok } from "@/lib/api";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json().catch(() => null);
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) return fail("Invalid input", 400);
    const { email, password } = parsed.data;

    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) return fail("Invalid email or password", 401);

    const okPwd = await user.comparePassword(password);
    if (!okPwd) return fail("Invalid email or password", 401);

    user.lastActiveAt = new Date();
    await user.save();

    const token = signToken({ uid: String(user._id), email: user.email, role: user.role });
    // Return the token in the response body so non-cookie clients (e.g. the
    // Android app) can store it and attach Authorization: Bearer on subsequent
    // requests. Web clients ignore it and keep using the httpOnly cookie.
    const res = ok({ user: user.toPublicJSON(), token });
    res.cookies.set(AUTH_COOKIE, token, authCookieOptions());
    return res;
  });
}

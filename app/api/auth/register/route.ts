import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { signToken, AUTH_COOKIE, authCookieOptions } from "@/lib/auth";
import { fail, handle, ok } from "@/lib/api";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  fullName: z.string().min(2).max(80),
  gender: z.enum(["male", "female", "other"]),
  dob: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "invalid dob"),
});

export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json().catch(() => null);
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return fail("Invalid input", 400, { issues: parsed.error.flatten() });
    }
    const { email, password, fullName, gender, dob } = parsed.data;

    await connectDB();
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return fail("Email already registered", 409);

    const user = new User({
      email: email.toLowerCase(),
      fullName,
      gender,
      dob: new Date(dob),
    });
    await user.setPassword(password);
    await user.save();

    const token = signToken({ uid: String(user._id), email: user.email, role: user.role });
    const res = ok({ user: user.toPublicJSON() }, { status: 201 });
    res.cookies.set(AUTH_COOKIE, token, authCookieOptions());
    return res;
  });
}

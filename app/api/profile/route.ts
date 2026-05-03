import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { handle, ok, requireSession } from "@/lib/api";

const PartnerPrefSchema = z
  .object({
    ageMin: z.number().int().min(18).max(99).optional(),
    ageMax: z.number().int().min(18).max(99).optional(),
    heightMinCm: z.number().int().min(120).max(230).optional(),
    heightMaxCm: z.number().int().min(120).max(230).optional(),
    religions: z.array(z.string()).optional(),
    communities: z.array(z.string()).optional(),
    motherTongues: z.array(z.string()).optional(),
    maritalStatuses: z.array(z.string()).optional(),
    countries: z.array(z.string()).optional(),
    cities: z.array(z.string()).optional(),
    educationLevels: z.array(z.string()).optional(),
    professions: z.array(z.string()).optional(),
    diet: z.array(z.string()).optional(),
    smoking: z.array(z.string()).optional(),
    drinking: z.array(z.string()).optional(),
  })
  .partial();

const ProfileUpdateSchema = z
  .object({
    fullName: z.string().min(2).max(80).optional(),
    heightCm: z.number().int().min(120).max(230).nullable().optional(),
    maritalStatus: z.enum(["never_married", "divorced", "widowed", "separated"]).optional(),
    religion: z.string().max(50).optional(),
    community: z.string().max(80).optional(),
    motherTongue: z.string().max(50).optional(),
    country: z.string().max(80).optional(),
    city: z.string().max(80).optional(),
    educationLevel: z.string().max(80).optional(),
    educationField: z.string().max(120).optional(),
    profession: z.string().max(120).optional(),
    incomeRange: z.string().max(80).optional(),
    diet: z.string().max(20).optional(),
    smoking: z.string().max(20).optional(),
    drinking: z.string().max(20).optional(),
    familyType: z.string().max(40).optional(),
    familyValues: z.string().max(40).optional(),
    bio: z.string().max(2000).optional(),
    partnerPreferences: PartnerPrefSchema.optional(),
  })
  .strict();

export async function GET() {
  return handle(async () => {
    const session = requireSession();
    await connectDB();
    const user = await User.findById(session.uid);
    if (!user) return ok({ user: null });
    return ok({ user: user.toPublicJSON() });
  });
}

export async function PATCH(req: Request) {
  return handle(async () => {
    const session = requireSession();
    const body = await req.json().catch(() => ({}));
    const parsed = ProfileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return ok({ error: "invalid", issues: parsed.error.flatten() }, { status: 400 });
    }
    await connectDB();
    const user = await User.findByIdAndUpdate(session.uid, { $set: parsed.data }, { new: true });
    if (!user) return ok({ user: null });
    return ok({ user: user.toPublicJSON() });
  });
}

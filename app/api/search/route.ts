import { connectDB } from "@/lib/mongodb";
import { User, type IUser } from "@/models/User";
import { handle, ok, requireSession } from "@/lib/api";
import { computeMatchScore } from "@/lib/matchScore";

function parseList(v: string | null): string[] | undefined {
  if (!v) return undefined;
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}
function parseInt0(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(req: Request) {
  return handle(async () => {
    const session = requireSession();
    const url = new URL(req.url);
    const q = url.searchParams;

    await connectDB();
    const me = await User.findById(session.uid);
    if (!me) return ok({ results: [], total: 0 });

    const ageMin = parseInt0(q.get("ageMin"));
    const ageMax = parseInt0(q.get("ageMax"));
    const heightMin = parseInt0(q.get("heightMin"));
    const heightMax = parseInt0(q.get("heightMax"));
    const religions = parseList(q.get("religions"));
    const motherTongues = parseList(q.get("motherTongues"));
    const maritalStatuses = parseList(q.get("maritalStatuses"));
    const cities = parseList(q.get("cities"));
    const countries = parseList(q.get("countries"));
    const educationLevels = parseList(q.get("educationLevels"));
    const text = q.get("q")?.trim();
    const page = Math.max(1, parseInt0(q.get("page")) ?? 1);
    const limit = Math.min(50, Math.max(1, parseInt0(q.get("limit")) ?? 12));

    const filter: Record<string, unknown> = {
      _id: { $ne: me._id },
      isActive: true,
    };

    const wantGender = q.get("gender");
    if (wantGender) filter.gender = wantGender;
    else if (me.gender === "male") filter.gender = "female";
    else if (me.gender === "female") filter.gender = "male";

    if (religions?.length) filter.religion = { $in: religions };
    if (motherTongues?.length) filter.motherTongue = { $in: motherTongues };
    if (maritalStatuses?.length) filter.maritalStatus = { $in: maritalStatuses };
    if (cities?.length) filter.city = { $in: cities };
    if (countries?.length) filter.country = { $in: countries };
    if (educationLevels?.length) filter.educationLevel = { $in: educationLevels };
    if (heightMin || heightMax) {
      const range: Record<string, number> = {};
      if (heightMin) range.$gte = heightMin;
      if (heightMax) range.$lte = heightMax;
      filter.heightCm = range;
    }
    if (ageMin || ageMax) {
      const now = new Date();
      const dobRange: Record<string, Date> = {};
      if (ageMax) {
        const d = new Date(now);
        d.setFullYear(d.getFullYear() - ageMax - 1);
        dobRange.$gte = d;
      }
      if (ageMin) {
        const d = new Date(now);
        d.setFullYear(d.getFullYear() - ageMin);
        dobRange.$lte = d;
      }
      filter.dob = dobRange;
    }
    if (text) {
      filter.$or = [
        { fullName: { $regex: text, $options: "i" } },
        { profession: { $regex: text, $options: "i" } },
        { city: { $regex: text, $options: "i" } },
        { bio: { $regex: text, $options: "i" } },
      ];
    }

    const [total, docs] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .sort({ lastActiveAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
    ]);

    const results = docs.map((u: IUser) => ({
      ...(u.toCardJSON() as Record<string, unknown>),
      matchScore: computeMatchScore(me, u),
    }));
    results.sort((a, b) => (b.matchScore as number) - (a.matchScore as number));

    return ok({ results, page, limit, total });
  });
}

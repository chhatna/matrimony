import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Interest } from "@/models/Interest";
import { Notification } from "@/models/Notification";
import { getSession } from "@/lib/auth";
import { computeMatchScore } from "@/lib/matchScore";
import ProfileCard, { type ProfileCardData } from "@/components/ProfileCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = getSession()!;
  await connectDB();
  const me = await User.findById(session.uid);
  if (!me) return null;

  const oppositeGender = me.gender === "male" ? "female" : me.gender === "female" ? "male" : null;
  const filter: Record<string, unknown> = { _id: { $ne: me._id }, isActive: true };
  if (oppositeGender) filter.gender = oppositeGender;

  const [recommendedDocs, pendingCount, notifsUnread, recentNotifs] = await Promise.all([
    User.find(filter).sort({ lastActiveAt: -1 }).limit(60),
    Interest.countDocuments({ to: me._id, status: "pending" }),
    Notification.countDocuments({ user: me._id, readAt: null }),
    Notification.find({ user: me._id }).sort({ createdAt: -1 }).limit(8).populate("fromUser", "fullName photos"),
  ]);

  const recommended: ProfileCardData[] = recommendedDocs
    .map((u) => ({ ...(u.toCardJSON() as ProfileCardData), matchScore: computeMatchScore(me, u) }))
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
    .slice(0, 12);

  const profileCompleteness = computeCompleteness(me);

  return (
    <div className="space-y-6">
      {profileCompleteness < 100 && (
        <div className="card p-4 flex items-center justify-between gap-4 bg-gradient-to-r from-brand-50 to-white">
          <div>
            <div className="font-medium text-gray-900">
              Your profile is {profileCompleteness}% complete
            </div>
            <div className="text-sm text-gray-600">
              Complete profiles get up to 5x more matches.
            </div>
          </div>
          <Link href="/profile/edit" className="btn-primary text-sm">
            Complete profile
          </Link>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/interests?tab=received" className="card p-4 hover:shadow-md transition-shadow">
          <div className="text-sm text-gray-500">Pending interests</div>
          <div className="text-2xl font-semibold mt-1">{pendingCount}</div>
        </Link>
        <Link href="/dashboard" className="card p-4 hover:shadow-md transition-shadow">
          <div className="text-sm text-gray-500">Unread notifications</div>
          <div className="text-2xl font-semibold mt-1">{notifsUnread}</div>
        </Link>
        <Link href="/search" className="card p-4 hover:shadow-md transition-shadow">
          <div className="text-sm text-gray-500">Browse</div>
          <div className="text-2xl font-semibold mt-1">Search matches &rarr;</div>
        </Link>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recommended for you</h2>
          <Link href="/search" className="text-sm text-brand-600 font-medium">View all</Link>
        </div>
        {recommended.length === 0 ? (
          <div className="card p-8 text-center text-gray-500">No matches yet. Check back soon.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {recommended.map((p) => (
              <ProfileCard key={p._id} p={p} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Recent activity</h2>
        <div className="card divide-y">
          {recentNotifs.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">No notifications yet.</div>
          ) : (
            recentNotifs.map((n) => (
              <div key={String(n._id)} className="p-3 flex items-center gap-3 text-sm">
                <div className="w-9 h-9 rounded-full bg-gray-100 grid place-items-center text-gray-500 font-semibold">
                  {(n.fromUser as { fullName?: string })?.fullName?.[0] ?? "?"}
                </div>
                <div className="flex-1">
                  <div className="text-gray-800">{describeNotif(n.type, n.fromUser)}</div>
                  <div className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</div>
                </div>
                {!n.readAt && <span className="w-2 h-2 rounded-full bg-brand-600" />}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function describeNotif(type: string, fromUser: unknown): string {
  const name = (fromUser as { fullName?: string })?.fullName ?? "Someone";
  switch (type) {
    case "interest_received": return `${name} sent you an interest`;
    case "interest_accepted": return `${name} accepted your interest`;
    case "interest_declined": return `${name} declined your interest`;
    case "message_received": return `${name} sent you a message`;
    case "profile_view": return `${name} viewed your profile`;
    default: return "Activity";
  }
}

function computeCompleteness(u: { bio?: string; photos?: string[]; heightCm?: number | null; profession?: string; educationLevel?: string; religion?: string; city?: string; partnerPreferences?: { religions?: string[]; ageMin?: number } }): number {
  const checks = [
    !!u.bio && u.bio.length > 30,
    (u.photos?.length ?? 0) > 0,
    !!u.heightCm,
    !!u.profession,
    !!u.educationLevel,
    !!u.religion,
    !!u.city,
    (u.partnerPreferences?.religions?.length ?? 0) > 0 || !!u.partnerPreferences?.ageMin,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

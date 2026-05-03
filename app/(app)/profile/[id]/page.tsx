import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Interest } from "@/models/Interest";
import { ProfileView } from "@/models/ProfileView";
import { Notification } from "@/models/Notification";
import { getSession } from "@/lib/auth";
import { computeMatchScore } from "@/lib/matchScore";
import InterestActions from "./InterestActions";

export const dynamic = "force-dynamic";

export default async function ProfileDetailPage({ params }: { params: { id: string } }) {
  const session = getSession()!;
  await connectDB();
  const [me, u] = await Promise.all([
    User.findById(session.uid),
    User.findById(params.id),
  ]);
  if (!u || !me) notFound();

  const isMe = String(u._id) === session.uid;

  if (!isMe) {
    await ProfileView.create({ viewer: me._id, viewed: u._id }).catch(() => null);
    await Notification.create({ user: u._id, type: "profile_view", fromUser: me._id }).catch(() => null);
  }

  const interest = isMe
    ? null
    : await Interest.findOne({
        $or: [
          { from: me._id, to: u._id },
          { from: u._id, to: me._id },
        ],
      });

  const matchScore = isMe ? null : computeMatchScore(me, u);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="card overflow-hidden">
          <div className="aspect-[16/9] bg-gray-100">
            {u.photos[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.photos[0]} alt={u.fullName} className="w-full h-full object-cover" />
            ) : (
              <div className="grid place-items-center w-full h-full text-7xl text-gray-300 font-light">
                {u.fullName[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold">
                  {u.fullName}
                  {u.isVerifiedProfile && (
                    <span className="ml-2 align-middle text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  )}
                </h1>
                <div className="text-sm text-gray-500 mt-1">
                  {u.age != null && <>{u.age} yrs &middot; </>}
                  {u.gender}
                  {u.city && <> &middot; {u.city}{u.country && `, ${u.country}`}</>}
                </div>
              </div>
              {matchScore != null && (
                <div className="text-right">
                  <div className="text-3xl font-bold text-brand-600">{matchScore}%</div>
                  <div className="text-xs text-gray-500">match</div>
                </div>
              )}
            </div>
            {u.bio && <p className="mt-4 text-gray-700 whitespace-pre-wrap">{u.bio}</p>}
            {!isMe && (
              <div className="mt-6">
                <InterestActions
                  targetId={String(u._id)}
                  initial={
                    interest
                      ? {
                          id: String(interest._id),
                          status: interest.status,
                          iSent: String(interest.from) === session.uid,
                        }
                      : null
                  }
                />
              </div>
            )}
          </div>
        </div>

        {u.photos.length > 1 && (
          <div className="card p-4">
            <h2 className="font-semibold mb-3">Photos</h2>
            <div className="grid grid-cols-3 gap-3">
              {u.photos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p} src={p} alt="" className="w-full aspect-square object-cover rounded-lg" />
              ))}
            </div>
          </div>
        )}

        <div className="card p-6">
          <h2 className="font-semibold mb-3">Details</h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <Field k="Religion" v={u.religion} />
            <Field k="Community" v={u.community} />
            <Field k="Mother tongue" v={u.motherTongue} />
            <Field k="Marital status" v={u.maritalStatus.replaceAll("_", " ")} />
            <Field k="Height" v={u.heightCm ? `${u.heightCm} cm` : null} />
            <Field k="Education" v={u.educationLevel} />
            <Field k="Profession" v={u.profession} />
            <Field k="Diet" v={u.diet} />
          </dl>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Quick actions</h3>
          <Link href="/search" className="btn-secondary w-full text-sm">Back to search</Link>
        </div>
      </aside>
    </div>
  );
}

function Field({ k, v }: { k: string; v?: string | number | null }) {
  return (
    <>
      <dt className="text-gray-500">{k}</dt>
      <dd className="text-gray-900">{v || <span className="text-gray-400">—</span>}</dd>
    </>
  );
}

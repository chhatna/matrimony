import Link from "next/link";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import DeleteAccountButton from "./DeleteAccountButton";
import PhotoManager from "./PhotoManager";

export const dynamic = "force-dynamic";

export default async function MyProfilePage() {
  const session = getSession();
  if (!session) redirect("/login");
  await connectDB();
  const u = await User.findById(session.uid);
  if (!u) redirect("/login");

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{u.fullName}</h1>
              <div className="text-sm text-gray-500 mt-1">
                {u.age != null && <>{u.age} yrs &middot; </>}
                {u.gender}
                {u.city && <> &middot; {u.city}{u.country && `, ${u.country}`}</>}
              </div>
            </div>
            <Link href="/profile/edit" className="btn-primary">Edit profile</Link>
          </div>
          {u.bio && <p className="mt-4 text-gray-700 whitespace-pre-wrap">{u.bio}</p>}
        </div>

        <PhotoManager photos={u.photos} />

        <div className="card p-6">
          <h2 className="font-semibold mb-3">About me</h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <Field k="Religion" v={u.religion} />
            <Field k="Community" v={u.community} />
            <Field k="Mother tongue" v={u.motherTongue} />
            <Field k="Marital status" v={u.maritalStatus.replaceAll("_", " ")} />
            <Field k="Height" v={u.heightCm ? `${u.heightCm} cm` : null} />
            <Field k="Education" v={u.educationLevel} />
            <Field k="Field" v={u.educationField} />
            <Field k="Profession" v={u.profession} />
            <Field k="Income" v={u.incomeRange} />
            <Field k="Diet" v={u.diet} />
            <Field k="Smoking" v={u.smoking} />
            <Field k="Drinking" v={u.drinking} />
            <Field k="Family type" v={u.familyType} />
            <Field k="Family values" v={u.familyValues} />
          </dl>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold mb-3">Partner preferences</h2>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <Field k="Age" v={u.partnerPreferences?.ageMin && u.partnerPreferences?.ageMax
              ? `${u.partnerPreferences.ageMin} - ${u.partnerPreferences.ageMax}` : null} />
            <Field k="Height" v={u.partnerPreferences?.heightMinCm && u.partnerPreferences?.heightMaxCm
              ? `${u.partnerPreferences.heightMinCm} - ${u.partnerPreferences.heightMaxCm} cm` : null} />
            <Field k="Religions" v={u.partnerPreferences?.religions?.join(", ")} />
            <Field k="Mother tongues" v={u.partnerPreferences?.motherTongues?.join(", ")} />
            <Field k="Cities" v={u.partnerPreferences?.cities?.join(", ")} />
            <Field k="Education" v={u.partnerPreferences?.educationLevels?.join(", ")} />
          </dl>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="card p-4">
          <h3 className="font-semibold">Account</h3>
          <div className="text-sm text-gray-600 mt-1">{u.email}</div>
          <div className="mt-4 space-y-2">
            <Link href="/profile/edit" className="btn-secondary w-full">Edit profile</Link>
            <DeleteAccountButton />
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({ k, v }: { k: string; v?: string | number | null }) {
  return (
    <>
      <dt className="text-gray-500">{k}</dt>
      <dd className="text-gray-900">{v || <span className="text-gray-400">-</span>}</dd>
    </>
  );
}

import Link from "next/link";

export type ProfileCardData = {
  _id: string;
  fullName: string;
  age?: number | null;
  city?: string;
  country?: string;
  religion?: string;
  community?: string;
  motherTongue?: string;
  profession?: string;
  educationLevel?: string;
  heightCm?: number | null;
  maritalStatus?: string;
  photos?: string[];
  isVerifiedProfile?: boolean;
  matchScore?: number;
  bio?: string;
};

function formatHeight(cm?: number | null) {
  if (!cm) return null;
  const totalInches = Math.round(cm / 2.54);
  const ft = Math.floor(totalInches / 12);
  const inch = totalInches % 12;
  return `${ft}'${inch}"`;
}

export default function ProfileCard({ p }: { p: ProfileCardData }) {
  const photo = p.photos?.[0];
  const height = formatHeight(p.heightCm);
  return (
    <Link
      href={`/profile/${p._id}`}
      className="card overflow-hidden hover:shadow-md transition-shadow group"
    >
      <div className="aspect-[4/3] bg-gray-100 relative">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={p.fullName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-gray-400 text-5xl font-light">
            {p.fullName?.[0]?.toUpperCase() || "?"}
          </div>
        )}
        {typeof p.matchScore === "number" && (
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded-full text-xs font-semibold text-brand-700">
            {p.matchScore}% match
          </div>
        )}
        {p.isVerifiedProfile && (
          <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
            Verified
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-semibold text-gray-900 truncate">{p.fullName}</h3>
          {p.age != null && <span className="text-sm text-gray-500">{p.age}y</span>}
        </div>
        <div className="text-xs text-gray-500 truncate mt-0.5">
          {[p.city, p.country].filter(Boolean).join(", ")}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {p.religion && <span className="chip">{p.religion}</span>}
          {p.motherTongue && <span className="chip">{p.motherTongue}</span>}
          {height && <span className="chip">{height}</span>}
          {p.profession && <span className="chip truncate max-w-[140px]">{p.profession}</span>}
        </div>
      </div>
    </Link>
  );
}

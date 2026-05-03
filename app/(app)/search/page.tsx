"use client";
import { useEffect, useState } from "react";
import ProfileCard, { type ProfileCardData } from "@/components/ProfileCard";
import { RELIGIONS, MOTHER_TONGUES, MARITAL_STATUSES, EDUCATION_LEVELS } from "@/lib/constants";

type Filters = {
  q: string;
  ageMin: string;
  ageMax: string;
  heightMin: string;
  heightMax: string;
  religions: string[];
  motherTongues: string[];
  maritalStatuses: string[];
  educationLevels: string[];
  city: string;
  country: string;
};

const empty: Filters = {
  q: "",
  ageMin: "",
  ageMax: "",
  heightMin: "",
  heightMax: "",
  religions: [],
  motherTongues: [],
  maritalStatuses: [],
  educationLevels: [],
  city: "",
  country: "",
};

export default function SearchPage() {
  const [filters, setFilters] = useState<Filters>(empty);
  const [results, setResults] = useState<ProfileCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  function set<K extends keyof Filters>(k: K, v: Filters[K]) {
    setFilters((s) => ({ ...s, [k]: v }));
  }
  function toggleArr(k: "religions" | "motherTongues" | "maritalStatuses" | "educationLevels", v: string) {
    setFilters((s) => {
      const arr = s[k];
      return { ...s, [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] };
    });
  }

  useEffect(() => {
    const controller = new AbortController();
    async function run() {
      setLoading(true);
      const qs = new URLSearchParams();
      if (filters.q) qs.set("q", filters.q);
      if (filters.ageMin) qs.set("ageMin", filters.ageMin);
      if (filters.ageMax) qs.set("ageMax", filters.ageMax);
      if (filters.heightMin) qs.set("heightMin", filters.heightMin);
      if (filters.heightMax) qs.set("heightMax", filters.heightMax);
      if (filters.religions.length) qs.set("religions", filters.religions.join(","));
      if (filters.motherTongues.length) qs.set("motherTongues", filters.motherTongues.join(","));
      if (filters.maritalStatuses.length) qs.set("maritalStatuses", filters.maritalStatuses.join(","));
      if (filters.educationLevels.length) qs.set("educationLevels", filters.educationLevels.join(","));
      if (filters.city) qs.set("cities", filters.city);
      if (filters.country) qs.set("countries", filters.country);
      qs.set("page", String(page));
      qs.set("limit", "12");

      try {
        const res = await fetch(`/api/search?${qs.toString()}`, { signal: controller.signal });
        const json = await res.json();
        if (json.ok) {
          setResults(json.data.results);
          setTotal(json.data.total);
        }
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }
    run();
    return () => controller.abort();
  }, [filters, page]);

  const totalPages = Math.max(1, Math.ceil(total / 12));

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-6">
      <aside className="card p-4 h-max sticky top-20">
        <h3 className="font-semibold mb-3">Filters</h3>
        <div className="space-y-4 text-sm">
          <div>
            <label className="label">Search</label>
            <input
              className="input"
              placeholder="Name, profession, city..."
              value={filters.q}
              onChange={(e) => { setPage(1); set("q", e.target.value); }}
            />
          </div>

          <div>
            <label className="label">Age</label>
            <div className="flex gap-2">
              <input className="input" placeholder="min" type="number" min={18} max={80}
                value={filters.ageMin}
                onChange={(e) => { setPage(1); set("ageMin", e.target.value); }} />
              <input className="input" placeholder="max" type="number" min={18} max={80}
                value={filters.ageMax}
                onChange={(e) => { setPage(1); set("ageMax", e.target.value); }} />
            </div>
          </div>

          <div>
            <label className="label">Height (cm)</label>
            <div className="flex gap-2">
              <input className="input" placeholder="min" type="number"
                value={filters.heightMin}
                onChange={(e) => { setPage(1); set("heightMin", e.target.value); }} />
              <input className="input" placeholder="max" type="number"
                value={filters.heightMax}
                onChange={(e) => { setPage(1); set("heightMax", e.target.value); }} />
            </div>
          </div>

          <CheckGroup label="Religion" options={RELIGIONS} selected={filters.religions}
            onToggle={(v) => { setPage(1); toggleArr("religions", v); }} />

          <CheckGroup label="Mother tongue" options={MOTHER_TONGUES} selected={filters.motherTongues}
            onToggle={(v) => { setPage(1); toggleArr("motherTongues", v); }} />

          <CheckGroup label="Marital status"
            options={MARITAL_STATUSES.map((m) => m.value)}
            labels={Object.fromEntries(MARITAL_STATUSES.map((m) => [m.value, m.label]))}
            selected={filters.maritalStatuses}
            onToggle={(v) => { setPage(1); toggleArr("maritalStatuses", v); }} />

          <CheckGroup label="Education" options={EDUCATION_LEVELS} selected={filters.educationLevels}
            onToggle={(v) => { setPage(1); toggleArr("educationLevels", v); }} />

          <div>
            <label className="label">City</label>
            <input className="input" value={filters.city}
              onChange={(e) => { setPage(1); set("city", e.target.value); }} />
          </div>
          <div>
            <label className="label">Country</label>
            <input className="input" value={filters.country}
              onChange={(e) => { setPage(1); set("country", e.target.value); }} />
          </div>

          <button
            type="button"
            className="btn-secondary w-full"
            onClick={() => { setFilters(empty); setPage(1); }}
          >
            Reset filters
          </button>
        </div>
      </aside>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold">{loading ? "Searching..." : `${total} matches`}</h1>
        </div>
        {results.length === 0 && !loading ? (
          <div className="card p-10 text-center text-gray-500">
            No matches found. Try widening your filters.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {results.map((p) => (
              <ProfileCard key={p._id} p={p} />
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button className="btn-secondary text-sm py-1.5 px-3" disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button className="btn-secondary text-sm py-1.5 px-3" disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckGroup({
  label,
  options,
  selected,
  onToggle,
  labels,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  labels?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const visible = open ? options : options.slice(0, 5);
  return (
    <div>
      <div className="label">{label}</div>
      <div className="space-y-1 max-h-56 overflow-auto pr-1">
        {visible.map((o) => (
          <label key={o} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(o)}
              onChange={() => onToggle(o)}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span>{labels?.[o] ?? o}</span>
          </label>
        ))}
        {options.length > 5 && (
          <button type="button" className="text-xs text-brand-600" onClick={() => setOpen((s) => !s)}>
            {open ? "Show less" : `Show all (${options.length})`}
          </button>
        )}
      </div>
    </div>
  );
}

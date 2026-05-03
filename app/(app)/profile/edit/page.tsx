"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RELIGIONS, MOTHER_TONGUES, MARITAL_STATUSES, EDUCATION_LEVELS, DIET, HABITS } from "@/lib/constants";

type ProfileForm = {
  fullName: string;
  heightCm: string;
  maritalStatus: string;
  religion: string;
  community: string;
  motherTongue: string;
  country: string;
  city: string;
  educationLevel: string;
  educationField: string;
  profession: string;
  incomeRange: string;
  diet: string;
  smoking: string;
  drinking: string;
  familyType: string;
  familyValues: string;
  bio: string;
  partnerPreferences: {
    ageMin: string;
    ageMax: string;
    heightMinCm: string;
    heightMaxCm: string;
    religions: string[];
    motherTongues: string[];
    maritalStatuses: string[];
    educationLevels: string[];
    cities: string;
    countries: string;
  };
};

const blank: ProfileForm = {
  fullName: "",
  heightCm: "",
  maritalStatus: "never_married",
  religion: "",
  community: "",
  motherTongue: "",
  country: "",
  city: "",
  educationLevel: "",
  educationField: "",
  profession: "",
  incomeRange: "",
  diet: "",
  smoking: "",
  drinking: "",
  familyType: "",
  familyValues: "",
  bio: "",
  partnerPreferences: {
    ageMin: "21",
    ageMax: "40",
    heightMinCm: "150",
    heightMaxCm: "200",
    religions: [],
    motherTongues: [],
    maritalStatuses: [],
    educationLevels: [],
    cities: "",
    countries: "",
  },
};

export default function EditProfilePage() {
  const router = useRouter();
  const search = useSearchParams();
  const welcome = search.get("welcome");

  const [form, setForm] = useState<ProfileForm>(blank);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/profile");
      const json = await res.json();
      if (json.ok && json.data.user) {
        const u = json.data.user;
        setForm({
          fullName: u.fullName || "",
          heightCm: u.heightCm?.toString() || "",
          maritalStatus: u.maritalStatus || "never_married",
          religion: u.religion || "",
          community: u.community || "",
          motherTongue: u.motherTongue || "",
          country: u.country || "",
          city: u.city || "",
          educationLevel: u.educationLevel || "",
          educationField: u.educationField || "",
          profession: u.profession || "",
          incomeRange: u.incomeRange || "",
          diet: u.diet || "",
          smoking: u.smoking || "",
          drinking: u.drinking || "",
          familyType: u.familyType || "",
          familyValues: u.familyValues || "",
          bio: u.bio || "",
          partnerPreferences: {
            ageMin: u.partnerPreferences?.ageMin?.toString() || "21",
            ageMax: u.partnerPreferences?.ageMax?.toString() || "40",
            heightMinCm: u.partnerPreferences?.heightMinCm?.toString() || "150",
            heightMaxCm: u.partnerPreferences?.heightMaxCm?.toString() || "200",
            religions: u.partnerPreferences?.religions || [],
            motherTongues: u.partnerPreferences?.motherTongues || [],
            maritalStatuses: u.partnerPreferences?.maritalStatuses || [],
            educationLevels: u.partnerPreferences?.educationLevels || [],
            cities: (u.partnerPreferences?.cities || []).join(", "),
            countries: (u.partnerPreferences?.countries || []).join(", "),
          },
        });
      }
      setLoading(false);
    })();
  }, []);

  function set<K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }
  function setPref<K extends keyof ProfileForm["partnerPreferences"]>(k: K, v: ProfileForm["partnerPreferences"][K]) {
    setForm((s) => ({ ...s, partnerPreferences: { ...s.partnerPreferences, [k]: v } }));
  }
  function togglePrefArr(k: "religions" | "motherTongues" | "maritalStatuses" | "educationLevels", v: string) {
    setForm((s) => {
      const arr = s.partnerPreferences[k];
      return {
        ...s,
        partnerPreferences: {
          ...s.partnerPreferences,
          [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v],
        },
      };
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(false);
    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName,
        heightCm: form.heightCm ? parseInt(form.heightCm, 10) : null,
        maritalStatus: form.maritalStatus,
        religion: form.religion,
        community: form.community,
        motherTongue: form.motherTongue,
        country: form.country,
        city: form.city,
        educationLevel: form.educationLevel,
        educationField: form.educationField,
        profession: form.profession,
        incomeRange: form.incomeRange,
        diet: form.diet,
        smoking: form.smoking,
        drinking: form.drinking,
        familyType: form.familyType,
        familyValues: form.familyValues,
        bio: form.bio,
        partnerPreferences: {
          ageMin: parseInt(form.partnerPreferences.ageMin, 10) || undefined,
          ageMax: parseInt(form.partnerPreferences.ageMax, 10) || undefined,
          heightMinCm: parseInt(form.partnerPreferences.heightMinCm, 10) || undefined,
          heightMaxCm: parseInt(form.partnerPreferences.heightMaxCm, 10) || undefined,
          religions: form.partnerPreferences.religions,
          motherTongues: form.partnerPreferences.motherTongues,
          maritalStatuses: form.partnerPreferences.maritalStatuses,
          educationLevels: form.partnerPreferences.educationLevels,
          cities: form.partnerPreferences.cities.split(",").map((x) => x.trim()).filter(Boolean),
          countries: form.partnerPreferences.countries.split(",").map((x) => x.trim()).filter(Boolean),
        },
      };
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Save failed");
      setOk(true);
      if (welcome) router.push("/dashboard");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card p-8 text-center text-gray-500">Loading...</div>;

  return (
    <form onSubmit={save} className="space-y-6 max-w-3xl">
      {welcome && (
        <div className="card p-4 bg-brand-50 border-brand-200">
          <div className="font-medium">Welcome to Saathi!</div>
          <div className="text-sm text-gray-700">Add a few details to start getting matches.</div>
        </div>
      )}

      <Section title="Basic">
        <Field label="Full name"><input className="input" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} /></Field>
        <Field label="Height (cm)"><input className="input" type="number" value={form.heightCm} onChange={(e) => set("heightCm", e.target.value)} /></Field>
        <Field label="Marital status">
          <select className="input" value={form.maritalStatus} onChange={(e) => set("maritalStatus", e.target.value)}>
            {MARITAL_STATUSES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </Field>
        <Field label="Religion">
          <select className="input" value={form.religion} onChange={(e) => set("religion", e.target.value)}>
            <option value="">Select</option>
            {RELIGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Community"><input className="input" value={form.community} onChange={(e) => set("community", e.target.value)} /></Field>
        <Field label="Mother tongue">
          <select className="input" value={form.motherTongue} onChange={(e) => set("motherTongue", e.target.value)}>
            <option value="">Select</option>
            {MOTHER_TONGUES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="City"><input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
        <Field label="Country"><input className="input" value={form.country} onChange={(e) => set("country", e.target.value)} /></Field>
      </Section>

      <Section title="Education & Career">
        <Field label="Education level">
          <select className="input" value={form.educationLevel} onChange={(e) => set("educationLevel", e.target.value)}>
            <option value="">Select</option>
            {EDUCATION_LEVELS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Field of study"><input className="input" value={form.educationField} onChange={(e) => set("educationField", e.target.value)} /></Field>
        <Field label="Profession"><input className="input" value={form.profession} onChange={(e) => set("profession", e.target.value)} /></Field>
        <Field label="Income range"><input className="input" value={form.incomeRange} onChange={(e) => set("incomeRange", e.target.value)} /></Field>
      </Section>

      <Section title="Lifestyle">
        <Field label="Diet">
          <select className="input" value={form.diet} onChange={(e) => set("diet", e.target.value)}>
            <option value="">Select</option>
            {DIET.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
        <Field label="Smoking">
          <select className="input" value={form.smoking} onChange={(e) => set("smoking", e.target.value)}>
            <option value="">Select</option>
            {HABITS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
        <Field label="Drinking">
          <select className="input" value={form.drinking} onChange={(e) => set("drinking", e.target.value)}>
            <option value="">Select</option>
            {HABITS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </Field>
      </Section>

      <Section title="About me">
        <div className="col-span-2">
          <label className="label">Bio</label>
          <textarea className="input min-h-[120px]" maxLength={2000} value={form.bio} onChange={(e) => set("bio", e.target.value)} placeholder="Tell others about yourself, your values, and what you're looking for..." />
          <div className="text-xs text-gray-400 mt-1">{form.bio.length}/2000</div>
        </div>
      </Section>

      <Section title="Partner preferences">
        <Field label="Age min"><input className="input" type="number" value={form.partnerPreferences.ageMin} onChange={(e) => setPref("ageMin", e.target.value)} /></Field>
        <Field label="Age max"><input className="input" type="number" value={form.partnerPreferences.ageMax} onChange={(e) => setPref("ageMax", e.target.value)} /></Field>
        <Field label="Height min (cm)"><input className="input" type="number" value={form.partnerPreferences.heightMinCm} onChange={(e) => setPref("heightMinCm", e.target.value)} /></Field>
        <Field label="Height max (cm)"><input className="input" type="number" value={form.partnerPreferences.heightMaxCm} onChange={(e) => setPref("heightMaxCm", e.target.value)} /></Field>

        <div className="col-span-2">
          <label className="label">Preferred religions</label>
          <ChipPicker options={RELIGIONS} selected={form.partnerPreferences.religions} onToggle={(v) => togglePrefArr("religions", v)} />
        </div>
        <div className="col-span-2">
          <label className="label">Preferred mother tongues</label>
          <ChipPicker options={MOTHER_TONGUES} selected={form.partnerPreferences.motherTongues} onToggle={(v) => togglePrefArr("motherTongues", v)} />
        </div>
        <div className="col-span-2">
          <label className="label">Preferred education</label>
          <ChipPicker options={EDUCATION_LEVELS} selected={form.partnerPreferences.educationLevels} onToggle={(v) => togglePrefArr("educationLevels", v)} />
        </div>
        <Field label="Preferred cities (comma-separated)"><input className="input" value={form.partnerPreferences.cities} onChange={(e) => setPref("cities", e.target.value)} /></Field>
        <Field label="Preferred countries (comma-separated)"><input className="input" value={form.partnerPreferences.countries} onChange={(e) => setPref("countries", e.target.value)} /></Field>
      </Section>

      {err && <div className="text-red-600">{err}</div>}
      {ok && <div className="text-emerald-600">Saved.</div>}

      <div className="flex gap-3">
        <button className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
        <button type="button" className="btn-secondary" onClick={() => router.back()}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h2 className="font-semibold mb-4">{title}</h2>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function ChipPicker({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            type="button"
            key={o}
            onClick={() => onToggle(o)}
            className={`px-3 py-1 rounded-full text-sm border ${
              active ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-700 border-gray-300 hover:border-brand-400"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

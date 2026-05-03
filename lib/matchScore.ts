import type { IUser } from "@/models/User";

export function ageFromDob(dob?: Date | string | null): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

/**
 * Compute a 0-100 match score between viewer's partner preferences and a candidate user.
 * Each preference field contributes a weight; missing preference => skipped (no penalty).
 */
export function computeMatchScore(viewer: IUser, candidate: IUser): number {
  const prefs = viewer.partnerPreferences || ({} as IUser["partnerPreferences"]);
  const candAge = ageFromDob(candidate.dob);
  const checks: { weight: number; pass: boolean }[] = [];
  const push = (weight: number, pass: boolean) => checks.push({ weight, pass });

  if (prefs?.ageMin || prefs?.ageMax) {
    const min = prefs.ageMin ?? 18;
    const max = prefs.ageMax ?? 99;
    push(15, candAge != null && candAge >= min && candAge <= max);
  }
  if (prefs?.heightMinCm || prefs?.heightMaxCm) {
    const min = prefs.heightMinCm ?? 0;
    const max = prefs.heightMaxCm ?? 999;
    push(8, candidate.heightCm != null && candidate.heightCm >= min && candidate.heightCm <= max);
  }
  if (prefs?.religions?.length) push(15, prefs.religions.includes(candidate.religion));
  if (prefs?.communities?.length) push(8, prefs.communities.includes(candidate.community));
  if (prefs?.motherTongues?.length) push(8, prefs.motherTongues.includes(candidate.motherTongue));
  if (prefs?.maritalStatuses?.length) push(8, prefs.maritalStatuses.includes(candidate.maritalStatus));
  if (prefs?.countries?.length) push(8, prefs.countries.includes(candidate.country));
  if (prefs?.cities?.length) push(6, prefs.cities.includes(candidate.city));
  if (prefs?.educationLevels?.length) push(8, prefs.educationLevels.includes(candidate.educationLevel));
  if (prefs?.professions?.length) push(6, prefs.professions.includes(candidate.profession));
  if (prefs?.diet?.length) push(4, prefs.diet.includes(candidate.diet));
  if (prefs?.smoking?.length) push(3, prefs.smoking.includes(candidate.smoking));
  if (prefs?.drinking?.length) push(3, prefs.drinking.includes(candidate.drinking));

  if (!checks.length) return 50;
  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earned = checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0);
  return Math.round((earned / totalWeight) * 100);
}

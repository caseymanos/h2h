import type { AthleteSearchResult, AthleteResult } from './types';

const BASE = 'https://worldathletics.nimarion.de';

export async function searchAthletes(name: string): Promise<AthleteSearchResult[]> {
  if (!name || name.length < 2) return [];

  const resp = await fetch(`${BASE}/athletes/search?name=${encodeURIComponent(name)}`);
  if (!resp.ok) throw new Error(`Search failed: ${resp.status}`);

  const results: AthleteSearchResult[] = await resp.json();
  return results.sort((a, b) => a.levenshteinDistance - b.levenshteinDistance);
}

export async function getAthleteResults(athleteId: number): Promise<AthleteResult[]> {
  const resp = await fetch(`${BASE}/athletes/${athleteId}/results`);
  if (!resp.ok) throw new Error(`Results fetch failed: ${resp.status}`);

  return resp.json();
}

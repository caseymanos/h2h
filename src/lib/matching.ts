import type { AthleteResult, Matchup, HeadToHeadRecord, ScrapedResult } from './types';

const RELAY_PATTERNS = /relay|medley|4x/i;

/** Race codes that indicate non-final rounds */
const NON_FINAL_PREFIXES = ['H', 'SF', 'PR', 'Q'];

function isFinal(race: string): boolean {
  if (!race) return true;
  const upper = race.toUpperCase().trim();
  // F, F1, F2, DF etc. are finals. H1, SF2, PR4 are not.
  return !NON_FINAL_PREFIXES.some((p) => upper.startsWith(p));
}

function isRelay(discipline: string): boolean {
  return RELAY_PATTERNS.test(discipline);
}

export function filterResults(results: AthleteResult[]): AthleteResult[] {
  return results.filter((r) => isFinal(r.race) && !isRelay(r.discipline));
}

const RACE_LOCATIONS: Record<string, { city: string; country: string }> = {
  'Chicago': { city: 'Chicago', country: 'USA' },
  'Boston': { city: 'Boston', country: 'USA' },
  'London': { city: 'London', country: 'GBR' },
};

function raceCity(raceName: string): string {
  for (const [key, loc] of Object.entries(RACE_LOCATIONS)) {
    if (raceName.includes(key)) return loc.city;
  }
  return '';
}

function raceCountry(raceName: string): string {
  for (const [key, loc] of Object.entries(RACE_LOCATIONS)) {
    if (raceName.includes(key)) return loc.country;
  }
  return '';
}

/** Convert a scraped result into the AthleteResult shape used for matching */
function scrapedToAthleteResult(s: ScrapedResult): AthleteResult {
  return {
    category: '',
    competition: s.raceName,
    competitionId: hashCode(`${s.source}-${s.raceYear}`),
    date: s.raceDate,
    discipline: s.discipline,
    disciplineCode: s.discipline === 'Marathon' ? 'MAR' : s.discipline,
    eventId: 0,
    mark: s.mark,
    performanceValue: 0,
    place: s.place,
    race: 'F', // scraped results are finals
    resultScore: 0,
    wind: null,
    legal: true,
    isTechnical: false,
    location: {
      stadium: null,
      city: raceCity(s.raceName),
      country: raceCountry(s.raceName),
      indoor: false,
    },
    records: [],
  };
}

function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Merge World Athletics results with scraped results.
 * Deduplicates by (discipline, date) — if WA already has the result, skip the scraped one.
 */
export function mergeResults(
  waResults: AthleteResult[],
  scrapedResults: ScrapedResult[]
): AthleteResult[] {
  if (scrapedResults.length === 0) return waResults;

  // Build a set of existing WA result keys for dedup
  const existingKeys = new Set<string>();
  for (const r of waResults) {
    const dateStr = r.date.split('T')[0];
    existingKeys.add(`${r.discipline}|${dateStr}`);
  }

  const merged = [...waResults];
  for (const s of scrapedResults) {
    const key = `${s.discipline}|${s.raceDate}`;
    if (!existingKeys.has(key)) {
      merged.push(scrapedToAthleteResult(s));
      existingKeys.add(key);
    }
  }

  return merged;
}

type RaceKey = string;

function makeKey(r: AthleteResult): RaceKey {
  // Use competitionId + discipline + date for reliable matching
  const dateStr = r.date.split('T')[0];
  return `${r.competitionId}|${r.discipline}|${dateStr}`;
}

/** Fallback key using only discipline + date (for cross-source matching) */
function makeDateKey(r: AthleteResult): string {
  const dateStr = r.date.split('T')[0];
  return `${r.discipline}|${dateStr}`;
}

export function buildHeadToHead(
  resultsA: AthleteResult[],
  resultsB: AthleteResult[]
): HeadToHeadRecord {
  const filteredA = filterResults(resultsA);
  const filteredB = filterResults(resultsB);

  // Index athlete B by race key (primary) and discipline+date (fallback)
  const indexB = new Map<RaceKey, AthleteResult>();
  const indexBByDate = new Map<string, AthleteResult>();
  for (const r of filteredB) {
    indexB.set(makeKey(r), r);
    indexBByDate.set(makeDateKey(r), r);
  }

  const matchups: Matchup[] = [];
  const disciplineSet = new Set<string>();
  let winsA = 0;
  let winsB = 0;
  let ties = 0;

  for (const a of filteredA) {
    const key = makeKey(a);
    // Try exact match first, then fall back to discipline+date (handles scraped vs WA mismatches)
    const b = indexB.get(key) ?? indexBByDate.get(makeDateKey(a));
    if (!b) continue;

    const placeA = a.place || 999;
    const placeB = b.place || 999;

    let winner: 'a' | 'b' | 'tie';
    if (placeA < placeB) {
      winner = 'a';
      winsA++;
    } else if (placeB < placeA) {
      winner = 'b';
      winsB++;
    } else {
      winner = 'tie';
      ties++;
    }

    disciplineSet.add(a.discipline);

    matchups.push({
      date: a.date,
      discipline: a.discipline,
      competition: a.competition,
      venue: a.location?.city || '',
      country: a.location?.country || '',
      indoor: a.location?.indoor || false,
      athleteA: { mark: a.mark, place: placeA },
      athleteB: { mark: b.mark, place: placeB },
      winner,
    });
  }

  // Sort newest first
  matchups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    winsA,
    winsB,
    ties,
    total: matchups.length,
    matchups,
    disciplines: Array.from(disciplineSet).sort(),
  };
}

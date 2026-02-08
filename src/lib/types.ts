export interface AthleteSearchResult {
  id: number;
  firstname: string;
  lastname: string;
  country: string;
  birthdate: string | null;
  sex: string;
  levenshteinDistance: number;
}

export interface Location {
  stadium: string | null;
  city: string;
  country: string;
  indoor: boolean;
}

export interface AthleteResult {
  category: string;
  competition: string;
  competitionId: number;
  date: string;
  discipline: string;
  disciplineCode: string;
  eventId: number;
  mark: string;
  performanceValue: number;
  place: number;
  race: string;
  resultScore: number;
  wind: number | null;
  legal: boolean;
  isTechnical: boolean;
  location: Location;
  records: string[];
}

export interface SelectedAthlete {
  id: number;
  firstname: string;
  lastname: string;
  country: string;
}

export interface Matchup {
  date: string;
  discipline: string;
  competition: string;
  venue: string;
  country: string;
  indoor: boolean;
  athleteA: {
    mark: string;
    place: number;
  };
  athleteB: {
    mark: string;
    place: number;
  };
  winner: 'a' | 'b' | 'tie';
}

export interface HeadToHeadRecord {
  winsA: number;
  winsB: number;
  ties: number;
  total: number;
  matchups: Matchup[];
  disciplines: string[];
}

// ========== SCRAPED RESULTS ==========

export interface ScrapedResult {
  _id: string;
  athleteName: string;
  athleteWaId?: number;
  raceName: string;
  raceYear: number;
  raceDate: string;
  discipline: string;
  source: string;
  mark: string;
  place: number;
  placeGender?: number;
  bib?: string;
  division?: string;
  scrapedAt: number;
}

export interface SupportedRace {
  key: string;
  label: string;
  years: number[];
}

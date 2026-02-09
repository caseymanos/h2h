"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ========== RACE CONFIGS ==========

type ScraperType = "mikatiming" | "scc-events";

interface RaceConfig {
  sourceKey: string;
  raceName: string;
  scraperType: ScraperType;
  /** City for location metadata */
  city: string;
  // Mika Timing fields
  getUrl?: (year: number) => string;
  raceDate: (year: number) => string;
  /** Event code for Mika Timing search (e.g. "MAR", "R"). Omit to not filter by event. */
  eventCode?: string;
  /** Whether this race uses a history URL with event_date filter for past years */
  usesEventDateFilter?: boolean;
  // SCC Events fields
  sccEventIdent?: string;
}

const RACES: Record<string, RaceConfig> = {
  chicago: {
    sourceKey: "mikatiming-chicago",
    raceName: "Bank of America Chicago Marathon",
    scraperType: "mikatiming",
    getUrl: (year: number) => {
      return year >= 2025
        ? `https://results.chicagomarathon.com/${year}/`
        : `https://chicago-history.r.mikatiming.com/2024/`;
    },
    raceDate: (year: number) => `${year}-10-12`,
    eventCode: "MAR",
    usesEventDateFilter: true,
    city: "Chicago",
  },
  boston: {
    sourceKey: "mikatiming-boston",
    raceName: "Boston Marathon",
    scraperType: "mikatiming",
    getUrl: (year: number) => `https://results.baa.org/${year}/`,
    raceDate: (year: number) => `${year}-04-21`,
    city: "Boston",
  },
  london: {
    sourceKey: "mikatiming-london",
    raceName: "TCS London Marathon",
    scraperType: "mikatiming",
    getUrl: (year: number) => `https://results.tcslondonmarathon.com/${year}/`,
    raceDate: (year: number) => `${year}-04-21`,
    city: "London",
  },
  berlin: {
    sourceKey: "scc-berlin",
    raceName: "BMW Berlin Marathon",
    scraperType: "scc-events",
    sccEventIdent: "BM",
    raceDate: (year: number) => `${year}-09-29`,
    city: "Berlin",
  },
};

// ========== HTML PARSER ==========

interface ParsedResult {
  name: string;
  country: string;
  placeOverall: number;
  placeGender: number;
  bib: string;
  division: string;
  finish: string;
  year: number;
  event: string;
}

function extractText(html: string, pattern: RegExp): string {
  const match = html.match(pattern);
  return match ? match[1].trim() : "";
}

/**
 * Extract the text value from a Mika Timing field div.
 * Fields have the pattern: <div class="type-X">...<div class="visible-...">Label</div>VALUE</div>
 * This extracts VALUE by finding the last text content before the closing </div>.
 */
function extractFieldValue(item: string, typeClass: string): string {
  const pattern = new RegExp(typeClass + '[^>]*>([\\s\\S]*?)</div>\\s*\\n');
  const match = item.match(pattern);
  if (!match) return "";
  const content = match[1];
  // Get text after last </div> in the content (the actual value, not the label)
  const lastClose = content.lastIndexOf("</div>");
  if (lastClose >= 0) {
    return content.substring(lastClose + 6).trim();
  }
  // No inner div — direct text content (strip any tags)
  return content.replace(/<[^>]*>/g, "").trim();
}

function parseResultsHtml(html: string): ParsedResult[] {
  const results: ParsedResult[] = [];

  const itemPattern =
    /<li\s+class="[^"]*list-group-item[^"]*"(?:(?!list-group-header)[^>])*>([\s\S]*?)<\/li>/g;
  let itemMatch;

  while ((itemMatch = itemPattern.exec(html)) !== null) {
    const item = itemMatch[0];

    if (item.includes("list-group-header")) continue;

    const nameMatch = item.match(
      /type-fullname[^>]*>(?:<a[^>]*>)?\s*([^<]+)\s*(?:<\/a>)?/
    );
    if (!nameMatch) continue;

    const fullNameRaw = nameMatch[1].trim();
    // Name can be "Lastname, Firstname (CTZ)" or just "Lastname, Firstname"
    const nameCountryMatch = fullNameRaw.match(/^(.+?)\s*\((\w+)\)\s*$/);
    let name: string;
    let country: string;
    if (nameCountryMatch) {
      name = nameCountryMatch[1].trim();
      country = nameCountryMatch[2];
    } else if (fullNameRaw.includes(",")) {
      name = fullNameRaw;
      country = "";
    } else {
      continue;
    }

    const placeOverallRaw = extractText(
      item,
      /place-secondary[^>]*>\s*(?:<[^>]*>)?\s*(\d+|–)/
    );
    const placeOverall =
      placeOverallRaw && placeOverallRaw !== "–"
        ? parseInt(placeOverallRaw, 10)
        : 0;

    const placeGenderRaw = extractText(
      item,
      /place-primary[^>]*>\s*(?:<[^>]*>)?\s*(\d+|–)/
    );
    const placeGender =
      placeGenderRaw && placeGenderRaw !== "–"
        ? parseInt(placeGenderRaw, 10)
        : 0;

    const yearRaw = extractFieldValue(item, "type-event_date");
    const year = yearRaw ? parseInt(yearRaw, 10) : 0;

    const event = extractFieldValue(item, "type-event_name");

    const bib = extractFieldValue(item, "type-field");

    const division = extractFieldValue(item, "type-age_class");

    // Time fields contain nested divs: <div class="type-time">...<div>Label</div>HH:MM:SS</div>
    // Extract all time fields, then grab the last HH:MM:SS (which is the finish, not split)
    const timeMatches = [
      ...item.matchAll(/type-time[^>]*>[\s\S]*?(\d{2}:\d{2}:\d{2})/g),
    ];
    const finish =
      timeMatches.length > 0
        ? timeMatches[timeMatches.length - 1][1].trim()
        : "";

    if (!finish || finish === "–") continue;

    results.push({
      name,
      country,
      placeOverall,
      placeGender,
      bib,
      division: division.trim(),
      finish,
      year,
      event,
    });
  }

  return results;
}

// ========== NAME MATCHING ==========

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z\s]/g, "").trim();
}

function nameMatches(
  parsed: string,
  targetFirstName: string,
  targetLastName: string
): boolean {
  const parts = parsed.split(",").map((s) => s.trim());
  if (parts.length < 2) return false;

  const parsedLast = normalizeName(parts[0]);
  const parsedFirst = normalizeName(parts[1]);
  const targetLast = normalizeName(targetLastName);
  const targetFirst = normalizeName(targetFirstName);

  if (parsedLast === targetLast && parsedFirst === targetFirst) return true;

  if (
    parsedLast === targetLast &&
    (parsedFirst.startsWith(targetFirst) || targetFirst.startsWith(parsedFirst))
  )
    return true;

  return false;
}

// ========== SCC EVENTS API (Berlin Marathon) ==========

interface SccCompetition {
  competition_ident: string;
  tablename: string;
  label_en: string;
}

interface SccEdition {
  year: number;
  competitions: SccCompetition[];
}

interface SccResult {
  name: string;
  vorname: string;
  nachname: string;
  sex: string;
  nation: string;
  platz: number;
  sex_platz: number;
  ak: string;
  netto: string;
  brutto: string;
  startnummer: string;
}

async function scrapeSccEvents(
  eventIdent: string,
  year: number,
  firstName: string,
  lastName: string
): Promise<ParsedResult[]> {
  // Step 1: Fetch event config to get correct competition_ident and tablename
  const configResp = await fetch(
    `https://api.results.scc-events.com/event/${eventIdent}?l=en`
  );
  if (!configResp.ok) {
    throw new Error(`SCC config fetch failed: ${configResp.status}`);
  }
  const configData = await configResp.json();
  const editions: Record<string, SccEdition> = configData.data[0].editions;
  const edition = editions[String(year)];
  if (!edition) {
    throw new Error(
      `No ${eventIdent} edition for ${year}. Available: ${Object.keys(editions).sort().join(", ")}`
    );
  }

  // Find the "Runner" competition
  const runnerComp = edition.competitions.find(
    (c: SccCompetition) => c.label_en === "Runner"
  );
  if (!runnerComp) {
    throw new Error(
      `No Runner competition for ${eventIdent} ${year}`
    );
  }

  // Step 2: Search for the athlete using DataTables server-side format
  const params = new URLSearchParams({
    ek: eventIdent,
    ci: runnerComp.competition_ident,
    y: String(year),
    t: runnerComp.tablename,
    draw: "1",
    start: "0",
    length: "20",
    "columns[0][data]": "platz",
    "columns[0][searchable]": "false",
    "columns[1][data]": "startnummer",
    "columns[1][searchable]": "true",
    "columns[2][data]": "nachname",
    "columns[2][searchable]": "true",
    "columns[3][data]": "vorname",
    "columns[3][searchable]": "true",
    "columns[4][data]": "verein",
    "columns[4][searchable]": "true",
    "columns[5][data]": "nation",
    "columns[5][searchable]": "true",
    "search[value]": lastName,
    "search[regex]": "false",
  });

  const resultResp = await fetch(
    `https://api.results.scc-events.com/result?${params.toString()}`
  );
  if (!resultResp.ok) {
    throw new Error(`SCC result fetch failed: ${resultResp.status}`);
  }
  const resultData = await resultResp.json();

  return (resultData.data as SccResult[]).map((r) => ({
    name: `${r.nachname}, ${r.vorname}`,
    country: r.nation || "",
    placeOverall: r.platz,
    placeGender: r.sex_platz,
    bib: r.startnummer || "",
    division: r.ak || "",
    finish: r.netto || "",
    year,
    event: "",
  }));
}

// ========== SCRAPE ACTION ==========

export const scrapeMarathonResults = action({
  args: {
    athleteFirstName: v.string(),
    athleteLastName: v.string(),
    athleteWaId: v.optional(v.number()),
    raceKey: v.string(),
    raceYear: v.number(),
  },
  handler: async (ctx, args) => {
    const config = RACES[args.raceKey];
    if (!config) {
      throw new Error(
        `Unknown race: ${args.raceKey}. Available: ${Object.keys(RACES).join(", ")}`
      );
    }

    let parsed: ParsedResult[];

    if (config.scraperType === "scc-events") {
      // SCC Events API (Berlin, etc.)
      parsed = await scrapeSccEvents(
        config.sccEventIdent!,
        args.raceYear,
        args.athleteFirstName,
        args.athleteLastName
      );
    } else {
      // Mika Timing HTML scraper (Chicago, Boston, London)
      const baseUrl = config.getUrl!(args.raceYear);
      const searchUrl = new URL(baseUrl);
      searchUrl.searchParams.set("pid", "search");
      searchUrl.searchParams.set("lang", "EN_CAP");
      if (config.eventCode) {
        searchUrl.searchParams.set("event", config.eventCode);
      }
      searchUrl.searchParams.set("search[name]", args.athleteLastName);
      searchUrl.searchParams.set("search[firstname]", args.athleteFirstName);
      if (config.usesEventDateFilter && args.raceYear < 2025) {
        searchUrl.searchParams.set("search[event_date]", String(args.raceYear));
      }
      searchUrl.searchParams.set("search_sort", "name");
      searchUrl.searchParams.set("num_results", "100");

      const resp = await fetch(searchUrl.toString());
      if (!resp.ok) {
        throw new Error(
          `Mika Timing fetch failed: ${resp.status} ${resp.statusText}`
        );
      }

      const html = await resp.text();
      parsed = parseResultsHtml(html);
    }

    const match = parsed.find((r) =>
      nameMatches(r.name, args.athleteFirstName, args.athleteLastName)
    );

    if (!match) {
      return {
        found: false as const,
        message: `No result found for ${args.athleteFirstName} ${args.athleteLastName} at ${config.raceName} ${args.raceYear}. Found ${parsed.length} results for similar names.`,
        candidates: parsed.slice(0, 5).map((r) => r.name),
      };
    }

    const nameParts = match.name.split(",").map((s) => s.trim());
    const storedName = `${nameParts[1]} ${nameParts[0]}`.toLowerCase();

    const scrapedResult = {
      athleteName: storedName,
      athleteWaId: args.athleteWaId,
      raceName: config.raceName,
      raceYear: args.raceYear,
      raceDate: config.raceDate(args.raceYear),
      discipline: "Marathon",
      source: config.sourceKey,
      mark: match.finish,
      place: match.placeOverall,
      placeGender: match.placeGender || undefined,
      bib: match.bib || undefined,
      division: match.division || undefined,
    };

    await ctx.runMutation(internal.h2h.saveScrapedResults, {
      results: [scrapedResult],
    });

    return {
      found: true as const,
      result: scrapedResult,
    };
  },
});

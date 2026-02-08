"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ========== RACE CONFIGS ==========

interface RaceConfig {
  sourceKey: string;
  raceName: string;
  getUrl: (year: number) => string;
  raceDate: (year: number) => string;
}

const RACES: Record<string, RaceConfig> = {
  chicago: {
    sourceKey: "mikatiming-chicago",
    raceName: "Bank of America Chicago Marathon",
    getUrl: (year: number) => {
      const base =
        year >= 2025
          ? `https://results.chicagomarathon.com/${year}/`
          : `https://chicago-history.r.mikatiming.com/${year}/`;
      return base;
    },
    raceDate: (year: number) => `${year}-10-12`,
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
    const nameCountryMatch = fullNameRaw.match(/^(.+?)\s*\((\w+)\)\s*$/);
    if (!nameCountryMatch) continue;

    const name = nameCountryMatch[1].trim();
    const country = nameCountryMatch[2];

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

    const baseUrl = config.getUrl(args.raceYear);
    const searchUrl = new URL(baseUrl);
    searchUrl.searchParams.set("pid", "search");
    searchUrl.searchParams.set("lang", "EN_CAP");
    searchUrl.searchParams.set("event", "MAR");
    searchUrl.searchParams.set("event_main_group", "runner");
    searchUrl.searchParams.set("search[name]", args.athleteLastName);
    searchUrl.searchParams.set("search[firstname]", args.athleteFirstName);
    searchUrl.searchParams.set("search_sort", "name");
    searchUrl.searchParams.set("num_results", "100");

    const resp = await fetch(searchUrl.toString());
    if (!resp.ok) {
      throw new Error(
        `Mika Timing fetch failed: ${resp.status} ${resp.statusText}`
      );
    }

    const html = await resp.text();
    const parsed = parseResultsHtml(html);

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

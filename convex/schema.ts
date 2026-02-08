import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ========== SCRAPED RACE RESULTS ==========
  h2hScrapedResults: defineTable({
    athleteName: v.string(),
    athleteWaId: v.optional(v.number()),
    raceName: v.string(),
    raceYear: v.number(),
    raceDate: v.string(),
    discipline: v.string(),
    source: v.string(),
    mark: v.string(),
    place: v.number(),
    placeGender: v.optional(v.number()),
    bib: v.optional(v.string()),
    division: v.optional(v.string()),
    scrapedAt: v.number(),
  })
    .index("by_athlete", ["athleteName"])
    .index("by_athlete_wa", ["athleteWaId"])
    .index("by_race", ["raceName", "raceYear"])
    .index("by_source_race", ["source", "raceYear", "athleteName"]),

  // ========== CACHED WA RESULTS ==========
  h2hCachedResults: defineTable({
    athleteId: v.number(),
    athleteName: v.string(),
    results: v.any(),
    fetchedAt: v.number(),
  })
    .index("by_athlete", ["athleteId"]),
});

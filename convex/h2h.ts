import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// ========== CACHED WA RESULTS ==========

export const getCachedResults = query({
  args: { athleteId: v.number() },
  handler: async (ctx, { athleteId }) => {
    const cached = await ctx.db
      .query("h2hCachedResults")
      .withIndex("by_athlete", (q) => q.eq("athleteId", athleteId))
      .first();

    if (!cached) return null;
    if (Date.now() - cached.fetchedAt > CACHE_TTL) return null;

    return cached;
  },
});

export const cacheResults = mutation({
  args: {
    athleteId: v.number(),
    athleteName: v.string(),
    results: v.any(),
  },
  handler: async (ctx, { athleteId, athleteName, results }) => {
    const existing = await ctx.db
      .query("h2hCachedResults")
      .withIndex("by_athlete", (q) => q.eq("athleteId", athleteId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        athleteName,
        results,
        fetchedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("h2hCachedResults", {
        athleteId,
        athleteName,
        results,
        fetchedAt: Date.now(),
      });
    }
  },
});

// ========== SCRAPED RESULTS ==========

export const getScrapedResults = query({
  args: { athleteName: v.string() },
  handler: async (ctx, { athleteName }) => {
    const normalized = athleteName.toLowerCase().trim();
    const results = await ctx.db
      .query("h2hScrapedResults")
      .withIndex("by_athlete", (q) => q.eq("athleteName", normalized))
      .collect();
    return results;
  },
});

export const getScrapedResultsByWaId = query({
  args: { athleteWaId: v.number() },
  handler: async (ctx, { athleteWaId }) => {
    const results = await ctx.db
      .query("h2hScrapedResults")
      .withIndex("by_athlete_wa", (q) => q.eq("athleteWaId", athleteWaId))
      .collect();
    return results;
  },
});

export const saveScrapedResults = internalMutation({
  args: {
    results: v.array(
      v.object({
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
      })
    ),
  },
  handler: async (ctx, { results }) => {
    for (const result of results) {
      // Dedup: check if we already have this exact source+race+year+athlete
      const existing = await ctx.db
        .query("h2hScrapedResults")
        .withIndex("by_source_race", (q) =>
          q
            .eq("source", result.source)
            .eq("raceYear", result.raceYear)
            .eq("athleteName", result.athleteName)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          ...result,
          scrapedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("h2hScrapedResults", {
          ...result,
          scrapedAt: Date.now(),
        });
      }
    }
  },
});
